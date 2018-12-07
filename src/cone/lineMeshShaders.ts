'use strict';
import {
    BufferGeometry, InterleavedBufferAttribute, InterleavedBuffer, Line, Material,
} from 'three';
import { CONFIGURATION } from '../common/configuration';
import { Shaders } from '../shaders';
import { GPUComputer } from '../common/gpuComputer';
import {  ILookupLine } from '../definitions/project';

let _lines: LineMeshShader[];

let _linesWithoutDisplay: LineMeshShader[] = [];
let uuid: string = undefined;
let _ready = false;
let _width: number;
let _height: number;
let _coefficient: number = 1.25; // hauteur du mid-point de controle bezier

let _gpgpu: { [x: string]: GPUComputer } = {};

let _t: Float32Array;
let _hauteurs: Float32Array;

function fullCleanArrays(): void {
    _t = new Float32Array(0);
    _hauteurs = new Float32Array(0);
}
fullCleanArrays();

// formule de la hauteur des arcs fonction de theta
// et du ratio des vitesses
function getHeight(ratio: number, theta: number): number {
    const semiTheta = theta / 2;
    const sinSemiTheta = Math.sin(semiTheta);
    const cosSemiTheta = Math.cos(semiTheta);
    const secondTerm =  Math.sqrt(Math.abs(ratio * ratio - sinSemiTheta * sinSemiTheta));
    const thirdTerm = 0;
    /* return (cosSemiTheta + Math.sqrt(ratio * ratio - sinSemiTheta * sinSemiTheta) - 1) *
        CONFIGURATION.earthRadiusMeters * _coefficient; */
    return (cosSemiTheta + secondTerm + thirdTerm ) *
        CONFIGURATION.earthRadiusMeters ; //* _coefficient;
}

// quand on change step!!
function regenerateStep(): void {
    const step = 1 / CONFIGURATION.pointsPerLine;
    let t: number[] = [];
    for (let i = 0; i < 1; i += step) {
        t.push(i);
    }
    t.push(1);
    _t = new Float32Array(t);
    _width = _t.length;
    let options = {
        u_tSample: { src: _t, width: _width, height: 1 },
    };
    _gpgpu.positions.updateTextures(options);
}

function updateYear(): void {
    let year = CONFIGURATION.year;
    _linesWithoutDisplay = [];
    for (let i = 0; i < _height; i++) {
        if (!_lines[i].isAvailable(year)) {
            _linesWithoutDisplay.push(_lines[i]);
        }
    }
}

function computation(): void {
    let uniforms: { [x: string]: number | ArrayBufferView } = {};
    uniforms.longueurMaxi = CONFIGURATION.extrudedHeight;
    uniforms.threeRadius = CONFIGURATION.THREE_EARTH_RADIUS;
    uniforms.earthRadius = CONFIGURATION.earthRadiusMeters;
    uniforms.referenceEquiRectangular = CONFIGURATION.referenceEquiRectangularArray;
    uniforms.representationInit = CONFIGURATION.projectionInit;
    uniforms.representationEnd = CONFIGURATION.projectionEnd;
    uniforms.percentRepresentation = CONFIGURATION.percentProjection;
    uniforms.standardParallel1 = CONFIGURATION.standardParallel1;
    uniforms.standardParallel2 = CONFIGURATION.standardParallel2;
    uniforms.coefficient = _coefficient;
    _gpgpu.positions.updateUniforms(uniforms);
    let options = {
        u_height: { src: _hauteurs, width: 1, height: _height },
    };
    _gpgpu.positions.updateTextures(options);
    let tempo = _gpgpu.positions.calculate(_width, _height);
    let allPositions = tempo[0];
    for (let i = 0; i < _height; i++) {
        _lines[i].setGeometry(allPositions.subarray(i * _width * 4, (i + 1) * _width * 4));
    }
}

export class LineMeshShader extends Line {

    private begin: string | number;
    private end: string | number;
    private opening: number;
    private _years: { [year: string]: number };
    private _transportName: string;
    private _ratio: number;

    public static generateCones(lookup: ILookupLine): Promise<LineMeshShader[]> {
        _ready = false;
        _lines = [];
        fullCleanArrays();
        let promise = new Promise((resolve, reject) => {
            if (uuid === undefined) {
                Promise.all([
                    GPUComputer.GPUComputerFactory(
                        Shaders.getShader('lineMeshShader', 'fragment'), {
                            u_tSample: 'R32F',
                            u_PControls0: 'RGB32F',
                            u_PControls1: 'RGB32F',
                            u_PControls2: 'RGB32F',
                            u_PControls3: 'RGB32F',
                            u_height: 'R32F',
                        },
                        1).then(
                            (instance) => {
                                _gpgpu.positions = instance;
                                return instance;
                            }),
                ]).then(() => {
                    uuid = CONFIGURATION.addEventListener(
                        'heightRatio intrudedHeightRatio  referenceEquiRectangular THREE_EARTH_RADIUS ' +
                        'projectionBegin projectionEnd projectionPercent year pointsPerLine',
                        (name: string, value: any) => {
                            if (_ready === true) {
                                switch (name) {
                                    case 'pointsPerLine':
                                        _t = new Float32Array(0);
                                        regenerateStep();
                                        updateYear();
                                        computation();
                                        break;
                                    case 'year':
                                        updateYear();
                                        computation();
                                        break;
                                    default:
                                        computation();
                                }
                            }
                        });
                    resolve(0);
                });
            } else {
                resolve(0);
            }
        });

        return promise.then(() => {
            let pControls0: number[] = [];
            let pControls1: number[] = [];
            let pControls2: number[] = [];
            let pControls3: number[] = [];
            for (let cityCodeBegin in lookup) {
                if (lookup.hasOwnProperty(cityCodeBegin)) {
                    let begin = lookup[cityCodeBegin].begin;
                    let list = lookup[cityCodeBegin].list;
                    let beginGLSL = begin.position.toThreeGLSL();
                    for (let cityCodeEnd in list) {
                        if (list.hasOwnProperty(cityCodeEnd)) {
                            let endPoint = list[cityCodeEnd];
                            let pointPGLSL = endPoint.pointP.toThreeGLSL();
                            let pointQGLSL = endPoint.pointQ.toThreeGLSL();
                            let endGLSL = endPoint.end.position.toThreeGLSL();

                            for (let transportName in endPoint.ratio) {
                                if (endPoint.ratio.hasOwnProperty(transportName)) {
                                    let ratios = endPoint.ratio[transportName];
                                    _lines.push(new LineMeshShader(
                                        begin.cityCode, endPoint.end.cityCode, endPoint.opening, ratios, transportName));
                                    pControls0.push(...beginGLSL);
                                    pControls1.push(...pointPGLSL);
                                    pControls2.push(...pointQGLSL);
                                    pControls3.push(...endGLSL);
                                }
                            }
                        }
                    }
                }
            }
            _height = _lines.length;
            _hauteurs = new Float32Array(_height);
            let options = {
                u_PControls0: { src: new Float32Array(pControls0), width: 1, height: _height },
                u_PControls1: { src: new Float32Array(pControls1), width: 1, height: _height },
                u_PControls2: { src: new Float32Array(pControls2), width: 1, height: _height },
                u_PControls3: { src: new Float32Array(pControls3), width: 1, height: _height },
            };
            _gpgpu.positions.updateTextures(options);
            regenerateStep();
            updateYear();
            computation();
            _ready = true;
            return [..._lines];
        });
    }

    public static get coefficient(): number {
        return _coefficient;
    }
    public static set coefficient(value: number) {
        _coefficient = value;
        for (let i = 0; i < _height; i++) {
            let line = _lines[i];
            _hauteurs[i] = getHeight(line._ratio, line.opening);
        }
        computation();
    }
    public dispose(): void {
        this.geometry.dispose();
        (<Material>this.material).dispose();
    }

    public get transportName(): string {
        return this._transportName;
    }

    public setGeometry(positions: Float32Array): void {
        let bufferedGeometry = <BufferGeometry>this.geometry;
        if (_linesWithoutDisplay.indexOf(this) === -1) {
            let interleavedBuffer = (<InterleavedBufferAttribute>bufferedGeometry.getAttribute('position')).data;
            interleavedBuffer.set(positions, 0);
            interleavedBuffer.needsUpdate = true;
            bufferedGeometry.computeBoundingSphere();
            bufferedGeometry.setDrawRange(0, _width);
        } else {
            bufferedGeometry.setDrawRange(0, 0);
        }
    }

    public isAvailable(year: string | number): boolean {
        let ratio = this._years[year];
        let resultat = ratio !== undefined;
        if (resultat === true) {
            this._ratio = ratio;
            let index = _lines.indexOf(this);
            _hauteurs[index] = getHeight(this._ratio, this.opening);
        }
        return resultat;
    }

    private constructor(
        begin: string | number, end: string | number, opening: number, years: { [year: string]: number }, transportName: string) {
        const interleavedBufferPosition = new InterleavedBuffer(new Float32Array(204 * 4), 4).setDynamic(true);
        const interleavedBufferAttributePosition = new InterleavedBufferAttribute(interleavedBufferPosition, 3, 0, false);
        const bufferGeometry = new BufferGeometry();
        bufferGeometry.addAttribute('position', interleavedBufferAttributePosition);
        bufferGeometry.computeBoundingSphere();
        super(bufferGeometry, CONFIGURATION.BASIC_LINE_MATERIAL.clone());
        this._years = years;
        this.opening = opening;
        this.end = end;
        this.begin = begin;
        this.visible = true;
        this._transportName = transportName;
        this._ratio = 0;
    }
}
