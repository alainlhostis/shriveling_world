'use strict';
import { MeshBasicMaterial, LineBasicMaterial, Material } from 'three';
import { generateUUID } from './utils';
import {
    PROJECTION_ENUM, ICountryTextureURL, ICartographic, configurationObservableEvt, configurationCallback,
} from '../definitions/project';

interface IEventListItem {
    cb: configurationCallback;
    scope?: any;
    uuid: string;
}

const _deg2rad: number = Math.PI / 180;
const _rad2deg: number = 180 / Math.PI;
const _TWO_PI: number = 2 * Math.PI;
const _earthRadiusMeters: number = 6371e3;
const _OVER_PI: number = 1 / Math.PI;
const _OVER_TWO_PI: number = 1 / (2 * Math.PI);
const _referenceEquiRectangular: ICartographic = { latitude: 0, longitude: 0, height: 0 };
const _referenceEquiRectangularFloat32Array = new Float32Array(3);
let _standardParallel1: number = 30 * _deg2rad;
let _standardParallel2: number = 45 * _deg2rad;
let _heightRatio: number = 0;
let _intrudedHeightRatio: number = 0;
let _coneStep: number = 0;
let _TWEEN_TIMING: number = 0;
let _THREE_EARTH_RADIUS: number = 0;
let _projectionInit: PROJECTION_ENUM = PROJECTION_ENUM.none;
let _projectionEnd: PROJECTION_ENUM = PROJECTION_ENUM.none;
let _projectionPercent: number = 0;
let _year: string | number = 1980;
let _highLitedMaterial: MeshBasicMaterial;
let _COUNTRY_MATERIAL: Material;
let _BASIC_CONE_MATERIAL: Material;
let _BASIC_TEXT_MATERIAL: MeshBasicMaterial;
let _BASIC_LINE_MATERIAL: LineBasicMaterial;
let _pointsPerLine: number = 50;
let _SIZE_TEXT: number;

let _extrudedHeight: number = 0;
let _hatHeight: number = 0;
const _listeners: {
    heightRatio: IEventListItem[],
    intrudedHeightRatio: IEventListItem[],
    coneStep: IEventListItem[],
    TWEEN_TIMING: IEventListItem[],
    referenceEquiRectangular: IEventListItem[],
    THREE_EARTH_RADIUS: IEventListItem[],
    projectionBegin: IEventListItem[],
    projectionEnd: IEventListItem[],
    projectionPercent: IEventListItem[],
    year: IEventListItem[],
    tick: IEventListItem[],
    pointsPerLine: IEventListItem[],
} = {
    heightRatio: [],
    intrudedHeightRatio: [],
    coneStep: [],
    TWEEN_TIMING: [],
    referenceEquiRectangular: [],
    THREE_EARTH_RADIUS: [],
    projectionBegin: [],
    projectionEnd: [],
    projectionPercent: [],
    year: [],
    tick: [],
    pointsPerLine: [],
};
function fireEvents(attribute: configurationObservableEvt, value: any): void {
    if (_listeners.hasOwnProperty(attribute)) {
        let callBackList = _listeners[attribute];
        let item: { cb: configurationCallback, scope?: any };
        let scope: any;
        let callBack: configurationCallback;
        for (let i = 0; i < callBackList.length; i++) {
            item = callBackList[i];
            scope = item.scope;
            callBack = item.cb;
            callBack.call(scope, attribute, value);
        }
    }
}

export const CONFIGURATION = {
    get deg2rad(): number { return _deg2rad; },
    get rad2deg(): number { return _rad2deg; },
    get TWO_PI(): number { return _TWO_PI; },
    get earthRadiusMeters(): number { return _earthRadiusMeters; },
    get OVER_PI(): number { return _OVER_PI; },
    get OVER_TWO_PI(): number { return _OVER_TWO_PI; },
    get highLitedMaterial(): MeshBasicMaterial { return _highLitedMaterial; },
    set highLitedMaterial(value: MeshBasicMaterial) { _highLitedMaterial = value; },
    get heightRatio(): number { return _heightRatio; },
    set heightRatio(value: number) {
        _heightRatio = value;
        _hatHeight = _earthRadiusMeters * _heightRatio;
        fireEvents('heightRatio', value);
    },
    get intrudedHeightRatio(): number { return _intrudedHeightRatio; },
    set intrudedHeightRatio(value: number) {
        _intrudedHeightRatio = value;
        _extrudedHeight = _earthRadiusMeters * _intrudedHeightRatio;
        fireEvents('intrudedHeightRatio', value);
    },
    get coneStep(): number { return _coneStep; },
    set coneStep(value: number) {
        if (value >= _deg2rad && value < _TWO_PI) {
            _coneStep = value;
            fireEvents('coneStep', value);
        }
    },
    get pointsPerLine(): number { return _pointsPerLine; },
    set pointsPerLine(value: number) {
        if (value >= 1 && value <= 200) {
            _pointsPerLine = value;
            fireEvents('pointsPerLine', value);
        }
    },
    get extrudedHeight(): number { return _extrudedHeight; },
    get hatHeight(): number { return _hatHeight; },
    COUNTRY_TEXTURES: <ICountryTextureURL>{
        map: 'assets/earthmap4k.jpg',
        specularMap: 'assets/earthspec4k.jpg',
        bumpMap: 'assets/earthbump4k.jpg',
        normalMap: 'assets/earth_normalmap_flat4k.jpg',
    },
    CONE_TEXTURE: 'assets/coneTexture.png',
    get COUNTRY_MATERIAL(): Material { return _COUNTRY_MATERIAL; },
    get BASIC_CONE_MATERIAL(): Material { return _BASIC_CONE_MATERIAL; },
    get BASIC_TEXT_MATERIAL(): MeshBasicMaterial { return _BASIC_TEXT_MATERIAL; },
    set COUNTRY_MATERIAL(value: Material) { _COUNTRY_MATERIAL = value; },
    set BASIC_CONE_MATERIAL(value: Material) { _BASIC_CONE_MATERIAL = value; },
    set BASIC_TEXT_MATERIAL(value: MeshBasicMaterial) { _BASIC_TEXT_MATERIAL = value; },
    get BASIC_LINE_MATERIAL(): LineBasicMaterial { return _BASIC_LINE_MATERIAL; },
    set BASIC_LINE_MATERIAL(value: LineBasicMaterial) { _BASIC_LINE_MATERIAL = value; },
    get SIZE_TEXT(): number { return _SIZE_TEXT; },
    set SIZE_TEXT(value: number) { _SIZE_TEXT = value; },

    SKYBOX_URLS: <string[]>[
        'assets/px.jpg', 'assets/nx.jpg', 'assets/py.jpg', 'assets/ny.jpg', 'assets/pz.jpg', 'assets/nz.jpg',
    ],
    get referenceEquiRectangular(): ICartographic { return _referenceEquiRectangular; },
    set referenceEquiRectangular(value: ICartographic) {
        let updated = false;
        for (let attribute in value) {
            if (_referenceEquiRectangular.hasOwnProperty(attribute)) {
                updated = true;
                _referenceEquiRectangular[attribute] = value[attribute];
            }
        }
        if (updated) {
            _referenceEquiRectangularFloat32Array[0] = _referenceEquiRectangular.longitude;
            _referenceEquiRectangularFloat32Array[1] = _referenceEquiRectangular.latitude;
            _referenceEquiRectangularFloat32Array[2] = _referenceEquiRectangular.height;
            fireEvents('referenceEquiRectangular', _referenceEquiRectangular);
        }
    },
    get referenceEquiRectangularArray(): Float32Array { return _referenceEquiRectangularFloat32Array; },
    get standardParallel1(): number { return _standardParallel1; },
    get standardParallel2(): number { return _standardParallel2; },
    set standardParallel1(value: number) {
        if (Math.abs(value) < Math.PI / 2 && Math.abs(value - _standardParallel2) > .00000001) {
            _standardParallel1 = value;
            fireEvents('referenceEquiRectangular', _referenceEquiRectangular);
        }
    },
    set standardParallel2(value: number) {
        if (Math.abs(value) < Math.PI / 2 && Math.abs(value - _standardParallel1) > .00000001) {
            _standardParallel2 = value;
            fireEvents('referenceEquiRectangular', _referenceEquiRectangular);
        }
    },

    get THREE_EARTH_RADIUS(): number { return _THREE_EARTH_RADIUS; },
    set THREE_EARTH_RADIUS(value: number) { _THREE_EARTH_RADIUS = value; fireEvents('THREE_EARTH_RADIUS', value); },
    get TWEEN_TIMING(): number { return _TWEEN_TIMING; },
    set TWEEN_TIMING(value: number) { _TWEEN_TIMING = value; fireEvents('TWEEN_TIMING', value); },
    get year(): string | number { return _year; },
    set year(value: string | number) { _year = value; fireEvents('year', value); },

    get projectionInit(): PROJECTION_ENUM { return _projectionInit; },
    set projectionInit(value: PROJECTION_ENUM) {
        _projectionInit = value;
        fireEvents('projectionBegin', _projectionInit);
    },
    get projectionEnd(): PROJECTION_ENUM { return _projectionEnd; },
    set projectionEnd(value: PROJECTION_ENUM) {
        _projectionEnd = value;
        fireEvents('projectionEnd', _projectionEnd);
    },
    get percentProjection(): number { return _projectionPercent; },
    set percentProjection(value: number) {
        if (value >= 0 && value <= 100) {
            _projectionPercent = value;
            fireEvents('projectionPercent', value);
        }
    },
    addEventListener(events: string, callBack: configurationCallback, uuid = generateUUID(), scope?: any): string {
        let eventNames = events.split(' ');
        eventNames.forEach((name) => {
            if (_listeners.hasOwnProperty(name)) {
                (<IEventListItem[]>_listeners[name]).push({ cb: callBack, scope: scope, uuid: uuid });
            }
        });
        return uuid;
    },
    removeEventListener(uuid: string): void {
        let list: IEventListItem[];
        for (let evName in _listeners) {
            if (_listeners.hasOwnProperty(evName)) {
                list = _listeners[evName];
                for (let i = list.length - 1; i >= 0; i--) {
                    if (list[i].uuid === uuid) {
                        list.splice(i, 1);
                    }
                }
            }
        }
    },

    tick(): void {
        fireEvents('tick', 0);
    },
};

CONFIGURATION.coneStep = 15 * CONFIGURATION.deg2rad;
CONFIGURATION.heightRatio = 0.01;
CONFIGURATION.intrudedHeightRatio = 0.6;
CONFIGURATION.TWEEN_TIMING = 1000;
CONFIGURATION.THREE_EARTH_RADIUS = 100;
