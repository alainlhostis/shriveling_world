'use strict';
import {
	BufferGeometry,
	InterleavedBufferAttribute,
	BufferAttribute,
	InterleavedBuffer,
	DynamicDrawUsage,
} from 'three';
import { CONFIGURATION } from '../common/configuration';
import { PseudoCone } from './base';
import { LatLonH, interpolator, matchingBBox } from '../common/utils';
import type {
	ILookupCityGraph,
	IBBox,
	ILookupConeAngles,
	IConeAnglesItem as IConeAnglesItem,
} from '../definitions/project';
import { CONESSHAPE_ENUM } from '../definitions/project';
import type { NEDLocal, Coordinate } from '../common/referential';
import { getShader } from '../shaders';
import { GPUComputer } from '../common/gpuComputer';
const forbiddenAttributes = new Set(['referential', 'cone']);

/**
 * [[IShaderAlpha]] is a table of alphas with years
 */
interface IShaderAlpha {
	[year: string]: Float32Array;
}

let _cones: ConeMeshShader[];
let _indexesArr: Uint16Array;
let _localLimitsLookup: { [x: string]: Array<{ clock: number; distance: number }> };
let _cityCodeOrder: string[];
let uuid: string;
let _dirtyLimits = false;
let _tickCount = 0;
let _ready = false;
let _width: number;
let _height: number;
let _discriminant = 2;

/**
 * A list of [[GPUComputer]]
 */
const _gpgpu: { [x: string]: GPUComputer } = {};

let _clocks: Float32Array;
let _alphas: IShaderAlpha;

/**
 * Generates empty arrays of
 * * [[_localLimitsLookup]]
 * * [[_cityCodeOrder]]
 * * [[_clocks]] i.e. unitary triangular elements to compose cones
 * * [[_alphas]] cones angles
 * * [[_indexesArr]]
 */
function fullCleanArrays(): void {
	_localLimitsLookup = {};
	_cityCodeOrder = [];
	_clocks = new Float32Array(0);
	_alphas = {};
	_indexesArr = new Uint16Array(0);
}

fullCleanArrays();

/**
 * Function [[localLimitsRaw]]
 * @param boundaries
 * @param referential
 */
function localLimitsRaw(boundaries: LatLonH[][], referential: NEDLocal): Array<{ clock: number; distance: number }> {
	const allPoints: Coordinate[] = [];
	boundaries.forEach((boundary) => {
		boundary.forEach((position) => {
			allPoints.push(referential.latLonH2NED(position));
		});
	});
	const result: Array<{ clock: number; distance: number }> = [];
	allPoints.forEach((pos) => {
		const clook = Math.atan2(pos.y, pos.x);
		const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
		result.push(
			{ clock: clook, distance },
			{ clock: clook + CONFIGURATION.TWO_PI, distance },
			{ clock: clook - CONFIGURATION.TWO_PI, distance }
		);
	});
	result.sort((a, b) => a.clock - b.clock);
	return result;
}

/**
 * Function [[localLimitsFunction]]
 * @param tab
 * @param coneStep
 */
function localLimitsFunction(
	tab: Array<{ clock: number; distance: number }>,
	coneStep = CONFIGURATION.coneStep
): (x: number) => number {
	const clockDistance = tab.reduce((result, current) => {
		const clockClass = Math.floor(current.clock / coneStep) * coneStep;
		result[clockClass] =
			result[clockClass] === undefined ? current.distance : Math.min(result[clockClass], current.distance);
		return result;
	}, {});
	const temporary: Array<{ clock: number; distance: number }> = [];
	for (const clockString in clockDistance) {
		if (clockDistance.hasOwnProperty(clockString)) {
			temporary.push({ clock: Number.parseFloat(clockString), distance: clockDistance[clockString] });
		}
	}

	return interpolator(temporary, 'clock', 'distance');
}

/**
 * Function [[regenerateFromConeStep]] when [[coneStep]] is modified
 *
 * [[clocks]] are unitary triangles that compose cones, the higher [[coneStep]] the smaller clocks are
 */
function regenerateFromConeStep(): void {
	const step = CONFIGURATION.coneStep;
	const clocks: number[] = [];
	const index: number[] = [];
	let ia: number;
	let ib: number;
	let iab: number;
	let ibb: number;
	for (let i = 0; i < CONFIGURATION.TWO_PI; i += step) {
		clocks.push(i);
	}

	clocks.push(-1);
	_width = clocks.length;
	for (let i = 0; i < _width - 1; i++) {
		ia = i;
		ib = (ia + 1) % (_width - 1);
		index.push(ia, ib, _width - 1);
		iab = ia + _width;
		ibb = ib + _width;
		index.push(iab, ibb, 2 * _width - 1);
		index.push(ia, ib, iab, iab, ibb, ib);
	}

	_clocks = new Float32Array(clocks);
	_indexesArr = new Uint16Array(index);

	const cacheBoundary: { [cityCode: string]: Float32Array } = {};
	for (const cityCode in _localLimitsLookup) {
		if (_localLimitsLookup.hasOwnProperty(cityCode)) {
			const localBoundaryFunction = localLimitsFunction(_localLimitsLookup[cityCode]);
			const tempTab = new Float32Array(_width);
			for (let i = 0; i < _width; i++) {
				tempTab[i] = localBoundaryFunction(_clocks[i]);
			}

			cacheBoundary[cityCode] = tempTab;
		}
	}

	const boundaries = new Float32Array(_width * _height);
	for (let i = 0; i < _height; i++) {
		boundaries.set(cacheBoundary[_cityCodeOrder[i]], i * _width);
	}

	const options = {
		u_clocks: { src: _clocks, width: _width, height: 1 },
		u_boundaryLimits: { src: boundaries, width: _width, height: _height },
	};
	_gpgpu.positions.updateTextures(options);
}

/**
 * Function [[updateConesAngles]] sets the alpha (fixing slopes) of cones according to year
 * and deals with cones that shouldn't be displayed
 *
 * will call function [[getConeAngles]]
 */
function updateConesAngles(): void {
	const year = CONFIGURATION.year;
	const twoPI = CONFIGURATION.TWO_PI;
	const minimumGap = _discriminant * CONFIGURATION.coneStep;
	let clockA: number;
	let clockB: number;
	let interpol: (x: number) => number;
	if (!_alphas.hasOwnProperty(year)) {
		const tempAlphas = new Float32Array(_height * _width);
		for (let i = 0; i < _height; i++) {
			const coneAngles = _cones[i].getConeAngles(year);
			const coneRoadAlpha = coneAngles.coneRoadAlpha;
			const coneFastTerrModeAlpha = coneAngles.coneFastTerrModeAlpha;
			const coneAnglesTab = [...coneAngles.alphaTab];
			let subAlphas: Float32Array;
			const lengthAnglesTab = coneAnglesTab.length;
			if (lengthAnglesTab === 0) {
				// this city (cone) has no connection with other terrestrial modes in the network
				// whatever the choice, cone wil remain simple, based on road speed
				subAlphas = _clocks.map(() => coneRoadAlpha);
			} else if (CONFIGURATION.conesShape == CONESSHAPE_ENUM.basedOnRoad) {
				// all the cones are simple with unique road slope (for a given year)
				subAlphas = _clocks.map(() => coneRoadAlpha);
			} else {
				if (CONFIGURATION.conesShape == CONESSHAPE_ENUM.basedOnFastestTerrestrialMode) {
					// when an edge of a faster than road terrestrial (not aerial) mode
					// touches the city, the cone slope gets the slope value attached to this mode
					subAlphas = _clocks.map(() => coneFastTerrModeAlpha);
				} else if (CONFIGURATION.conesShape == CONESSHAPE_ENUM.complex) {
					// cones will be deformed locally by edges with
					// a 'faster than road terrestrial mode'
					const lastItem = { alpha: 0, clock: 0 };
					lastItem.alpha = coneAnglesTab[lengthAnglesTab - 1].alpha;
					lastItem.clock = coneAnglesTab[lengthAnglesTab - 1].clock - twoPI;
					const firstItem = { alpha: 0, clock: 0 };
					firstItem.alpha = coneAnglesTab[0].alpha;
					firstItem.clock = coneAnglesTab[0].clock + twoPI;
					// adding a first and last element in order to produce a table with overlap beyond [0, 2PI]
					coneAnglesTab.splice(0, 0, lastItem);
					coneAnglesTab.push(firstItem);
					console.log(_cones[i].name, minimumGap, coneAnglesTab);
					for (let i = lengthAnglesTab + 1; i > 0; i--) {
						clockA = coneAnglesTab[i - 1].clock;
						clockB = coneAnglesTab[i].clock;
						if (clockB - clockA > minimumGap) {
							// adding a road slope when
							// the gap between two destination cities is too wide
							coneAnglesTab.splice(i, 0, {
								alpha: coneRoadAlpha,
								clock: clockA + (clockB - clockA) / 2,
							});
						}
					}
				}

				interpol = interpolator(coneAnglesTab, 'clock', 'alpha');
				subAlphas = _clocks.map((clock) => interpol(clock));
			}

			tempAlphas.set(subAlphas, i * _width);
		}

		_alphas[year] = tempAlphas;
	}

	const options = {
		u_alphas: { src: _alphas[year], width: _width, height: _height },
	};
	_gpgpu.positions.updateTextures(options);
}

/**
 * Function [[updateWithLimits]] will apply the [[withLimits]] choice
 */
function updateWithLimits(): void {
	const withLimits = new Float32Array(_height);
	for (let i = 0; i < _height; i++) {
		withLimits[i] = _cones[i].withLimits ? 1 : 0;
	}

	const options = {
		u_withLimits: { src: withLimits, width: 1, height: _height },
	};
	_gpgpu.positions.updateTextures(options);
}

function computation(): void {
	const uniforms: { [x: string]: number | ArrayBufferView } = {};
	uniforms.longueurMaxi = CONFIGURATION.extrudedHeight;
	uniforms.threeRadius = CONFIGURATION.THREE_EARTH_RADIUS;
	uniforms.earthRadius = CONFIGURATION.earthRadiusMeters;
	uniforms.referenceEquiRectangular = CONFIGURATION.referenceEquiRectangularArray;
	uniforms.projectionInit = CONFIGURATION.projectionInit;
	uniforms.projectionEnd = CONFIGURATION.projectionEnd;
	uniforms.percentProjection = CONFIGURATION.percentProjection;
	uniforms.conesShape = CONFIGURATION.conesShape;
	uniforms.standardParallel1 = CONFIGURATION.standardParallel1;
	uniforms.standardParallel2 = CONFIGURATION.standardParallel2;
	uniforms.zCoeff = CONFIGURATION.zCoeff;

	_gpgpu.positions.updateUniforms(uniforms);
	const [begins, uvs, bases] = _gpgpu.positions.calculate(_width, _height);

	const finalPositions = new Float32Array(_width * 2 * _height * 4);
	const finalUV = new Float32Array(_width * 2 * _height * 4);
	let offset: number;
	let end: number;
	for (let i = 0; i < _height; i++) {
		offset = i * (_width * 2) * 4;
		finalPositions.set(begins.subarray(i * _width * 4, (i + 1) * _width * 4), offset);
		finalPositions.set(bases.subarray(i * _width * 4, (i + 1) * _width * 4), offset + 4 * _width);
		finalUV.set(uvs.subarray(i * _width * 4, (i + 1) * _width * 4), offset);
		finalUV.set(uvs.subarray(i * _width * 4, (i + 1) * _width * 4), offset + 4 * _width);
	}

	for (let i = 0; i < _height; i++) {
		offset = i * (_width * 2) * 4;
		end = offset + 2 * 4 * _width;
		_cones[i].setGeometry(finalPositions.subarray(offset, end), finalUV.subarray(offset, end));
	}
}

/**
 * Class [[ConeMeshShader]]
 */
export class ConeMeshShader extends PseudoCone {
	public otherProperties: any;
	private _withLimits: boolean;
	private readonly _cityCode: string;
	// Private _transportName: string;
	private readonly _position: LatLonH;
	private readonly _coneAngles: ILookupConeAngles;

	/**
	 * Will [[generateCones]] from [[cityGraph]]
	 * @param lookup
	 * @param bBoxes
	 */
	public static async generateCones(lookup: ILookupCityGraph, bBoxes: IBBox[]): Promise<ConeMeshShader[]> {
		_ready = false;
		_cones = [];
		fullCleanArrays();
		const promise = new Promise((resolve) => {
			if (uuid === undefined) {
				void Promise.all([
					GPUComputer.GPUComputerFactory(
						getShader('coneMeshShader', 'fragment'),
						{
							u_clocks: 'R32F',
							u_alphas: 'R32F',
							u_boundaryLimits: 'R32F',
							u_summits: 'RGB32F',
							u_ned2ECEF0s: 'RGB32F',
							u_ned2ECEF1s: 'RGB32F',
							u_ned2ECEF2s: 'RGB32F',
							u_withLimits: 'R32F',
						},
						3
					).then((instance) => {
						_gpgpu.positions = instance;
						return instance;
					}),
				]).then(() => {
					uuid = CONFIGURATION.addEventListener(
						'heightRatio intrudedHeightRatio coneStep  referenceEquiRectangular THREE_EARTH_RADIUS ' +
							'projectionBegin projectionEnd projectionPercent year tick conesShape zCoeff',
						(name: string) => {
							if (_ready) {
								switch (name) {
									case 'coneStep':
										_clocks = new Float32Array(0);
										_alphas = {};
										_indexesArr = new Uint16Array(0);
										regenerateFromConeStep();
										updateConesAngles();
										updateWithLimits();
										computation();
										break;
									case 'year':
										updateConesAngles();
										updateWithLimits();
										computation();
										break;
									case 'tick':
										if (_dirtyLimits && _tickCount > 10) {
											updateWithLimits();
											computation();
											_tickCount = 0;
											_dirtyLimits = false;
										} else {
											_tickCount++;
										}

										break;
									case 'projectionBegin':
										computation();
										break;
									case 'conesShape':
										_alphas = {};
										updateConesAngles();
										updateWithLimits();
										computation();
										break;
									default:
										computation();
								}
							}
						}
					);
					resolve(0);
				});
			} else {
				resolve(0);
			}
		});

		await promise;
		const summits: number[] = [];
		const ned2ECEF0: number[] = [];
		const ned2ECEF1: number[] = [];
		const ned2ECEF2: number[] = [];
		for (const cityCode in lookup) {
			if (lookup.hasOwnProperty(cityCode)) {
				const cityTransport = lookup[cityCode];
				const position = cityTransport.referential.latLonHRef;
				const referentialGLSL = cityTransport.referential.ned2ECEFMatrix;
				const coneAngles = cityTransport.cone;
				_localLimitsLookup[cityCode] = localLimitsRaw(
					matchingBBox(position, bBoxes),
					cityTransport.referential
				);
				const commonProperties = {};
				for (const attribute in cityTransport) {
					if (cityTransport.hasOwnProperty(attribute) && !forbiddenAttributes.has(attribute)) {
						commonProperties[attribute] = cityTransport[attribute];
					}
				}

				_cones.push(new ConeMeshShader(cityCode, position, coneAngles, commonProperties));
				_cityCodeOrder.push(cityCode);
				summits.push(...referentialGLSL.summit);
				ned2ECEF0.push(...referentialGLSL.ned2ECEF0);
				ned2ECEF1.push(...referentialGLSL.ned2ECEF1);
				ned2ECEF2.push(...referentialGLSL.ned2ECEF2);
			}
		}

		_height = _cones.length;
		const options = {
			u_summits: { src: new Float32Array(summits), width: 1, height: _height },
			u_ned2ECEF0s: { src: new Float32Array(ned2ECEF0), width: 1, height: _height },
			u_ned2ECEF1s: { src: new Float32Array(ned2ECEF1), width: 1, height: _height },
			u_ned2ECEF2s: { src: new Float32Array(ned2ECEF2), width: 1, height: _height },
		};
		_gpgpu.positions.updateTextures(options);
		regenerateFromConeStep();
		updateConesAngles();
		updateWithLimits();
		computation();
		_ready = true;
		return [..._cones];
	}

	/**
	 * Constructor
	 * @param cityCode
	 * @param position
	 * @param coneAngles
	 * @param properties
	 */
	private constructor(cityCode: string, position: LatLonH, coneAngles: ILookupConeAngles, properties: any) {
		const interleavedBufferPosition = new InterleavedBuffer(new Float32Array(400 * 4 * 2), 4).setUsage(
			DynamicDrawUsage
		);
		const interleavedBufferAttributePosition = new InterleavedBufferAttribute(
			interleavedBufferPosition,
			3,
			0,
			false
		);
		const interleavedBufferUV = new InterleavedBuffer(new Float32Array(400 * 4 * 2), 4).setUsage(DynamicDrawUsage);
		const interleavedBufferAttributeUV = new InterleavedBufferAttribute(interleavedBufferUV, 3, 0, false);
		const bufferGeometry = new BufferGeometry();
		bufferGeometry.setAttribute('position', interleavedBufferAttributePosition);
		bufferGeometry.setAttribute('uv', interleavedBufferAttributeUV);
		bufferGeometry.setIndex(new BufferAttribute(new Uint16Array(400 * 6 * 2), 1).setUsage(DynamicDrawUsage));
		bufferGeometry.setDrawRange(0, 0);
		bufferGeometry.computeBoundingSphere();
		super(bufferGeometry, CONFIGURATION.BASIC_CONE_MATERIAL.clone());
		this._cityCode = cityCode;
		this._position = position;
		this.otherProperties = properties;
		this._coneAngles = coneAngles;
		this._withLimits = true;
		this.visible = true;
		this.castShadow = true;
		// This.receiveShadow = true;
	}

	public static get discriminant(): number {
		return _discriminant;
	}

	public static set discriminant(value: number) {
		_discriminant = value;
		_alphas = {};
		updateConesAngles();
		computation();
	}

	public dispose(): void {
		super.dispose();
	}

	/**
	 * [[setGeometry]]
	 */
	public setGeometry(positions: Float32Array, uv: Float32Array): void {
		const bufferedGeometry = this.geometry;
		let interleavedBuffer = (<InterleavedBufferAttribute>bufferedGeometry.getAttribute('position')).data;
		interleavedBuffer.set(positions, 0);
		interleavedBuffer.needsUpdate = true;
		// BufferedGeometry.computeVertexNormals();
		bufferedGeometry.computeBoundingSphere();
		interleavedBuffer = (<InterleavedBufferAttribute>bufferedGeometry.getAttribute('uv')).data;
		interleavedBuffer.set(uv, 0);
		interleavedBuffer.needsUpdate = true;
		if (bufferedGeometry.drawRange.count !== _indexesArr.length) {
			bufferedGeometry.getIndex().set(_indexesArr);
			bufferedGeometry.getIndex().needsUpdate = true;
			bufferedGeometry.setDrawRange(0, _indexesArr.length);
		}
	}

	/**
	 * Return a [[IConeAnglesItem]] corresponding to a year for the city defined in this [[ConeMeshShader]]
	 * @param year
	 */
	public getConeAngles(year: string | number): IConeAnglesItem {
		return this._coneAngles[year];
	}

	get cityCode(): string {
		return this._cityCode;
	}

	get latLonHPosition(): LatLonH {
		return this._position;
	}

	get withLimits(): boolean {
		return this._withLimits;
	}

	set withLimits(value: boolean) {
		if (value !== this._withLimits) {
			_dirtyLimits = true;
			this._withLimits = value;
		}
	}
}
