import type {
	IIndication,
	IInfo,
	IRef,
	ISearch,
	IUserPos,
} from '../types/interfaces';
import type { Building, Indication, Location, Place } from '../types/models';

export function toISearch(place: Place): ISearch {
	return {
		name: place.name,
		type: place.type,
	};
}

export function toIRef(location: Location, building: Building): IRef {
	return {
		name: building.name,
		lowestF: building.lowestF,
		highestF: building.highestF,
		inside: building.inside,
		lat: location.lat,
		lng: location.lng,
	};
}

export function toIInfo(place: Place, ref?: IRef): IInfo {
	return {
		name: place.name,
		type: place.type,
		level: place.level,
		ref: ref,
	};
}

export function toIIndication(
	place: Place,
	location: Location,
	indication: Indication
): IIndication {
	return {
		name: place.name,
		img: place.img,
		forwardInfo: indication.forwardInfo,
		backwardInfo: indication.backwardInfo,
		lat: location.lat,
		lng: location.lng,
		rad: location.rad,
	};
}

export function toIUserPos(lat: string, lng: string): IUserPos {
	return {
		lat: lat,
		lng: lng,
	};
}
