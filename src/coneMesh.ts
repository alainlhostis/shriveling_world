namespace shriveling {
    'use strict';

    export class ConeMesh extends THREE.Mesh {

        get projection(): string {
            return (<ConeGeometry>this.geometry).projection;
        }

        set projection(value: string) {
            if ((<ConeGeometry>this.geometry).acceptProjection(value)) {
                (<ConeGeometry>this.geometry).projection = value;
            }
        }

        get year(): string {
            return (<ConeGeometry>this.geometry).year;
        }

        set year(value: string) {
            (<ConeGeometry>this.geometry).year = value;
            if ((<ConeGeometry>this.geometry).year === value) {
                this.visible = false;
            }
        }

        public constructor(
            name: string, countryName: string, summit: Cartographic, base: { [year: string]: IDirection[] },
            boundaryGeometries: THREE.Geometry[], projectionName: string, facet: boolean = false) {
            let geometry = new ConeGeometry(name, countryName, summit, base, boundaryGeometries, projectionName, facet);
            super(geometry, Configuration.NORMAL_MATERIAL);
            this.name = geometry.name;
        }
    }
}
