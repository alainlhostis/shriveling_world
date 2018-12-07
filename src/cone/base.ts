'use strict';
import { Mesh, Material, Geometry, BufferGeometry } from 'three';
import { Cartographic } from '../common/utils';
export abstract class PseudoCone extends Mesh {
    public abstract otherProperties: any;
    public abstract withLimits: boolean;
    public abstract readonly cartographicPosition: Cartographic;
    public abstract readonly cityCode: string;
    public abstract readonly transportName: string;
    constructor(geometry?: Geometry | BufferGeometry, material?: Material) {
        if (geometry instanceof Geometry) {
            super(geometry, material);
        } else {
            super(geometry, material);
        }
    }
    public dispose(): void {
        this.geometry.dispose();
        (<Material>this.material).dispose();
    }
}
