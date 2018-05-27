namespace shriveling {
    'use strict';

    function merger<U, V>(
        mother: U[], girl: V[], motherProperty: string, girlProperty: string, newName: string, forceArray: boolean,
        girlPropertyToRemove: boolean, motherPropertyToRemove: boolean): void {
        let subGirl: V, subMother: U, attribute: string;
        let lookupGirl: { [x: string]: V | V[] } = {};
        let lessThanOne = !forceArray;
        for (let j = 0; j < girl.length; j++) {
            subGirl = girl[j];
            if (subGirl.hasOwnProperty(girlProperty) && subGirl[girlProperty] !== undefined && subGirl[girlProperty] !== null) {
                attribute = subGirl[girlProperty].toString();
                if (girlPropertyToRemove === true) {
                    delete subGirl[girlProperty];
                }
                if (Array.isArray(lookupGirl[attribute])) {
                    (<V[]>lookupGirl[attribute]).push(subGirl);
                    lessThanOne = false;
                } else {
                    lookupGirl[attribute] = [subGirl];
                }
            }
        }
        if (lessThanOne === true) {
            for (attribute in lookupGirl) {
                if (lookupGirl.hasOwnProperty(attribute)) {
                    lookupGirl[attribute] = lookupGirl[attribute][0];
                }
            }
        }
        for (let i = 0; i < mother.length; i++) {
            subMother = mother[i];
            subMother[newName] = [];
            attribute = subMother[motherProperty];
            if (attribute !== undefined && attribute != null) {
                attribute = attribute.toString();
                if (lookupGirl.hasOwnProperty(attribute)) {
                    subMother[newName] = lookupGirl[attribute];
                }
            }
            if (motherPropertyToRemove === true) {
                delete subMother[motherProperty];
            }
        }
    }

    const keyWords: { name: string, words: string[] }[] = [
        { name: '_cities', words: ['cityCode', 'latitude', 'longitude', 'radius'] },
        { name: '_transportModeSpeed', words: ['transportModeCode', 'year', 'speedKPH'] },
        { name: '_transportModeCode', words: ['code', 'name', 'yearBegin'] },
        { name: '_transportNetwork', words: ['transportMode', 'idDes', 'idOri'] },
        { name: '_populations', words: ['cityCode'] },
    ];

    const config: Papa.ParseConfig = {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        fastMode: true,
    };

    function getCSV(text: string): any {
        return Papa.parse(text, config).data;
    }

    export type IMergerState = 'missing' | 'ready' | 'pending' | 'complete';

    function toTownTransport(
        transportModeCode: ITransportModeCode[], cities: ICity[], transportNetwork: ITransportNetwork[]): ILookupTownTransport {
        let resultat: ILookupTownTransport = {};
        // déterminer la fourchette de temps considéré OK
        let actualYear = (new Date()).getFullYear();
        let minYear = actualYear, maxYear = 0;
        transportNetwork.forEach((item) => {
            if (minYear > item.yearBegin) {
                minYear = item.yearBegin;
            }
        });
        // déterminer pour chaque type de transport la vitesse par an dans la fourchette + vitesse max par an de la fourchette OK
        interface ISpeedPerYear {
            [year: string]: number;
        }
        let speedMaxPerYear: ISpeedPerYear = {};
        interface ITransportCodeItem {
            speed: number;
            year: number;
        }
        interface ISpeedPertransportPerYearItem {
            tabSpeed: { [year: string]: number };
            name: string;
        }
        let roadCode: number, roadBegin: number;
        let speedPerTransportPerYear: { [transportCode: string]: ISpeedPertransportPerYearItem } = {};
        transportModeCode.forEach((transportMode) => {
            let transportCode = transportMode.code;
            let transportName = transportMode.name;
            if (transportName === 'Road') {
                roadCode = transportCode;
                roadBegin = Math.max(transportMode.yearBegin, minYear);
            }
            let minYearTransport = Math.max(transportMode.yearBegin, minYear);
            let maxYearTransport = transportMode.yearEnd !== undefined ? transportMode.yearEnd : actualYear;
            let tempTransportCodeTab: ITransportCodeItem[] = [], tabSpeed: { [year: string]: number } = {};
            let tempMaxYear: number;
            transportMode.speeds.forEach((transportSpeed) => {
                tempTransportCodeTab.push({ speed: transportSpeed.speedKPH, year: transportSpeed.year });
                if (maxYear < transportSpeed.year) {
                    maxYear = transportSpeed.year;
                }
                if (tempMaxYear === undefined) {
                    tempMaxYear = transportSpeed.year;
                }
                tempMaxYear = Math.max(tempMaxYear, transportSpeed.year);
            });
            maxYearTransport = Math.max(maxYearTransport, tempMaxYear);
            tempTransportCodeTab = tempTransportCodeTab.sort((a, b) => a.year - b.year);
            let extrapolation = extrapolator(tempTransportCodeTab, 'year', 'speed', true);
            let speed: number;
            for (let year = minYearTransport; year <= maxYearTransport; year++) {
                speed = extrapolation(year);
                tabSpeed[year] = speed;
                if (speedMaxPerYear.hasOwnProperty(year)) {
                    if (speedMaxPerYear[year] < speed) {
                        speedMaxPerYear[year] = speed;
                    }
                } else {
                    speedMaxPerYear[year] = speed;
                }
            }
            speedPerTransportPerYear[transportCode] = { tabSpeed: tabSpeed, name: transportName };
        });
        // faire lookup des cartographic/referential par citycode. OK
        let lookupPosition: { [cityCode: string]: NEDLocal } = {};
        cities.forEach((city) => {
            let position = new Cartographic(city.longitude, city.latitude, 0, false);
            lookupPosition[city.cityCode] = new NEDLocal(position);
        });
        cities.forEach((city) => {
            let cacheBearing: { [cityCode: string]: number } = {};
            let originCityCode = city.cityCode;
            let referential = lookupPosition[originCityCode];
            if (referential instanceof NEDLocal) {
                let transports: ILookupTransport = {};
                let destinations: ILookupDestination = {};
                let codeDestination: number;
                let edge: ITransportNetwork, min: number, max: number, bearing: number, elevation: number, elevationDegree: number;
                let transportName: string, transportMode: ISpeedPertransportPerYearItem;
                for (let i = 0; i < city.destinations.length; i++) {
                    edge = city.destinations[i];
                    min = Math.max(edge.yearBegin, minYear);
                    max = edge.yearEnd ? edge.yearEnd : maxYear;
                    codeDestination = edge.idDes;
                    transportMode = speedPerTransportPerYear[edge.transportMode];
                    if (cacheBearing.hasOwnProperty(codeDestination)) {
                        bearing = cacheBearing[codeDestination];
                    } else {
                        if (lookupPosition.hasOwnProperty(codeDestination)) {
                            bearing = referential.getClock(lookupPosition[codeDestination].cartoRef);
                            cacheBearing[codeDestination] = bearing;
                        } else {
                            bearing = undefined;
                        }
                    }
                    if (bearing !== undefined && transportMode !== undefined) {
                        transportName = transportMode.name;
                        if (!transports.hasOwnProperty(transportName)) {
                            transports[transportName] = {};
                        }
                        if (!destinations.hasOwnProperty(codeDestination)) {
                            destinations[codeDestination] = {};
                        }
                        if (!destinations[codeDestination].hasOwnProperty(transportName)) {
                            destinations[codeDestination][transportName] = [];
                        }
                        let tab = transportMode.tabSpeed;
                        for (let year = min; year <= max; year++) {
                            if (tab[year] !== undefined) {
                                if (!transports[transportName].hasOwnProperty(year)) {
                                    transports[transportName][year] = [];
                                }
                                elevation = Math.atan(Math.sqrt(
                                    (speedMaxPerYear[year] / tab[year]) * (speedMaxPerYear[year] / tab[year]) - 1));
                                if (elevation < 0) {
                                    elevation += Configuration.TWO_PI;
                                }
                                elevationDegree = elevation / Configuration.deg2rad;
                                transports[transportName][year].push(
                                    {
                                        clock: bearing, elevation: elevation, speed: tab[year],
                                        clockDegree: bearing / Configuration.deg2rad,
                                        elevationDegree: elevationDegree,
                                        destination: codeDestination,
                                        transport: transportName,
                                        year: year,
                                    });
                                destinations[codeDestination][transportName].push({ year: year, speed: tab[year] });
                            }
                        }
                    }
                }
                // utiliser roadCode pour remplir les routes
                if (!transports.hasOwnProperty('Road')) {
                    transports['Road'] = {};
                }
                let tab = speedPerTransportPerYear[roadCode].tabSpeed;
                let maxSpeed: number;
                for (let year = roadBegin; year <= maxYear; year++) {
                    if (!transports['Road'].hasOwnProperty(year)) {
                        transports['Road'][year] = [];
                    }
                    maxSpeed = speedMaxPerYear[year] === undefined ? tab[year] : speedMaxPerYear[year];
                    elevation = Math.atan(Math.sqrt(
                        (maxSpeed / tab[year]) * (maxSpeed / tab[year]) - 1));
                    if (elevation < 0) {
                        elevation += Configuration.TWO_PI;
                    }
                    elevationDegree = elevation / Configuration.deg2rad;
                    transports['Road'][year].push(
                        {
                            clock: 0, elevation: elevation, speed: tab[year],
                            clockDegree: 0, elevationDegree: elevationDegree, transport: 'Road', year: year,
                        });
                }
                // console.log(originCityCode, transports['Road']);

                for (let transport in transports) {
                    if (transports.hasOwnProperty(transport)) {
                        for (let year in transports[transport]) {
                            if (transports[transport].hasOwnProperty(year)) {
                                transports[transport][year] = transports[transport][year].sort((a, b) => a.clock - b.clock);
                            }
                        }
                    }
                }
                resultat[originCityCode] = {
                    referential: referential, transports: transports,
                    destinations: destinations, cityProperties: city,
                };
            }
        });
        return resultat;
    }

    export class Merger {
        private _cities: ICity[] = [];
        private _populations: IPopulation[] = [];
        private _transportModeSpeed: ITransportModeSpeed[] = [];
        private _transportModeCode: ITransportModeCode[] = [];
        private _transportNetwork: ITransportNetwork[] = [];
        private _state: IMergerState = 'missing';
        private _mergedData: ILookupTownTransport = {};

        get state(): IMergerState {
            return this._state;
        }

        get datas(): ILookupTownTransport {
            return this._mergedData;
        }

        public clear(): void {
            this._cities = [];
            this._populations = [];
            this._transportModeSpeed = [];
            this._transportModeCode = [];
            this._transportNetwork = [];
            this._mergedData = {};
            this._state = 'missing';
        }

        public add(someString: string): void {
            let rows = someString.split(/\r\n|\r|\n/);
            let headings = rows[0];
            let name, temp, ok;
            for (let i = 0; i < keyWords.length && name === undefined; i++) {
                temp = keyWords[i].words;
                ok = true;
                for (let j = 0; j < temp.length && ok === true; j++) {
                    if (headings.indexOf(temp[j]) === -1) {
                        ok = false;
                    }
                }
                if (ok === true) {
                    name = keyWords[i].name;
                }
            }
            if (name !== undefined) {
                this[name].push(...getCSV(someString));
                if (name === '_transportModeCode' || name === '_transportNetwork') {
                    this[name].forEach((item) => {
                        if (item.yearEnd === undefined || item.yearEnd === '') {
                            delete item.yearEnd;
                        }
                    });
                }
                this._checkState();
            } else {
                throw new Error('scheme unknown');
            }
        }

        public merge(): void {
            if (this._state === 'ready') {
                this._state = 'pending';
                let cities: ICity[] = JSON.parse(JSON.stringify(this._cities), reviver);
                let population: IPopulation[] = JSON.parse(JSON.stringify(this._populations), reviver);
                let transportModeCode: ITransportModeCode[] = JSON.parse(JSON.stringify(this._transportModeCode), reviver);
                let transportModeSpeed: ITransportModeSpeed[] = JSON.parse(JSON.stringify(this._transportModeSpeed), reviver);
                let transportNetwork: ITransportNetwork[] = JSON.parse(JSON.stringify(this._transportNetwork), reviver);

                merger(transportModeCode, transportModeSpeed, 'code', 'transportModeCode', 'speeds', true, true, false);
                //    merger(transportNetwork, transportModeCode, 'transportMode', 'code', 'transportDetails', false, false, false);
                merger(cities, population, 'cityCode', 'cityCode', 'populations', false, true, false);
                merger(transportNetwork, cities, 'idDes', 'cityCode', 'destination', false, false, false);
                merger(cities, transportNetwork, 'cityCode', 'idOri', 'destinations', true, true, false);
                this._mergedData = toTownTransport(transportModeCode, cities, transportNetwork);
                // console.log(cities, transportModeCode, transportNetwork, this._mergedData);
                this._state = 'missing';
                this._checkState();
            }
        }

        private _checkState(): void {
            if (this._state !== 'pending') {
                let state: IMergerState = 'missing';
                if (this._cities.length > 0 && this._populations.length > 0 &&
                    this._transportModeSpeed.length > 0 && this._transportModeCode.length > 0 &&
                    this._transportNetwork.length > 0) {
                    state = 'ready';
                    if (Object.keys(this._mergedData).length > 0) {
                        state = 'complete';
                    }
                }
                this._state = state;
            }
        }

    }
}
