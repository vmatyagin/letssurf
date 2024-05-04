import { useState } from "react";
import mapboxgl from "mapbox-gl";
import { MapboxMap } from "./MapboxMap";
import { MapLoadingHolder } from "./MapLoadingHolder";
import defaultAvatar from "./assets/surfer.png";
import { getLocations } from "./api";

const sourceKey = "usersGeojson";

type MappedLocation = {
    id: number;
    lat: number;
    lon: number;
    name: string;
    tg: string;
    username: string;
    userAbout: string;
    userFamilyStatus: string;
};

const loadLocations = async (): Promise<MappedLocation[]> => {
    const users = await getLocations();

    let counter = 1;
    return users.reduce((acc, user) => {
        !!user.location.length &&
            user.location.forEach((location) => {
                if (user.username) {
                    acc.push({
                        id: counter,
                        lat: location.latitude,
                        lon: location.longitude,
                        name: location.name,
                        tg: user.username,
                        username: user.name,
                        userAbout: user.about,
                        userFamilyStatus: user.family_status
                    });
                    counter++;
                }
            });

        return acc;
    }, [] as MappedLocation[]);
};

const createElement = () => {
    const el = document.createElement("div");
    el.classList.add("mapMarker");
    el.style.backgroundImage = "url('" + defaultAvatar + "')";
    return el;
};

const createCluster = (
    coords: mapboxgl.LngLatLike,
    count: string,
    onClick: VoidFunction
) => {
    const clusterElement = createElement();
    clusterElement.innerText = count;
    clusterElement.addEventListener("click", onClick);

    return new mapboxgl.Marker({
        element: clusterElement
    }).setLngLat(coords);
};

const createUser = (
    coords: mapboxgl.LngLatLike,
    name: string,
    description: string
) => {
    const element = createElement();
    const child = document.createElement("div");
    child.classList.add("mapMarker__child");
    const textNode = document.createElement("span");
    textNode.innerText = name;

    child.appendChild(textNode);
    element.appendChild(child);

    return new mapboxgl.Marker({
        element
    })
        .setLngLat(coords)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(description));
};

export const App = () => {
    const [loading, setLoading] = useState(true);
    const onLoaded = async (map: mapboxgl.Map) => {
        setLoading(false);
        const locations = await loadLocations();

        map.addSource(sourceKey, {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                features: locations.map((location) => ({
                    type: "Feature",
                    properties: {
                        id: location.id,
                        name: location.name.length
                            ? `${location.username} - ${location.name}`
                            : location.username,
                        description: `<span><span class="marker__emoji">📍</span><a class="marker__user" target="_blank" href="https://t.me/${location.tg}">${location.username}<a/></span><br/><span><span class="marker__emoji">❤️</span>${location.userFamilyStatus}</span><br/><span><span class="marker__emoji">🖥</span>${location.userAbout}</span>`
                    },
                    geometry: {
                        type: "Point",
                        coordinates: [location.lon, location.lat]
                    }
                }))
            },
            cluster: true,
            clusterRadius: 25
        });

        map.addLayer({
            id: "points",
            type: "symbol",
            source: "usersGeojson"
        });

        const markers: Record<number, mapboxgl.Marker> = {};
        let markersOnScreen: typeof markers = {};

        function updateMarkers() {
            const newMarkers: typeof markers = {};
            const features = map.querySourceFeatures(sourceKey);

            for (const feature of features) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                const coords = feature.geometry.coordinates;
                const props = feature.properties;

                if (!props) {
                    continue;
                }

                const id = props.cluster_id || props.id;

                let marker = markers[id];

                if (!marker) {
                    if (props.cluster) {
                        marker = markers[id] = createCluster(
                            coords,
                            props.point_count,
                            () => {
                                map.flyTo({
                                    center: coords,
                                    zoom: map.getZoom() + 2
                                });
                            }
                        );
                    } else {
                        marker = markers[id] = createUser(
                            coords,
                            props.name,
                            props.description
                        );
                    }
                }
                newMarkers[id] = marker;

                if (!markersOnScreen[id]) marker.addTo(map);
            }

            for (const id in markersOnScreen) {
                if (!newMarkers[id]) markersOnScreen[id].remove();
            }
            markersOnScreen = newMarkers;
        }
        let isInitialJumped = false;

        map.on("render", () => {
            if (!map.isSourceLoaded("usersGeojson")) return;
            updateMarkers();
            if (!isInitialJumped) {
                map.flyTo({
                    center: map.getCenter(),
                    zoom: map.getZoom()
                });
                isInitialJumped = true;
            }
        });

        map.on("move", updateMarkers);
        map.on("moveend", updateMarkers);
        map.on("resize", updateMarkers);
        map.on("idle", updateMarkers);

        map.on("click", "points", (e) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            const coordinates = e.features[0].geometry.coordinates.slice();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            const description = e.features[0].properties.description;

            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            new mapboxgl.Popup()
                .setLngLat(coordinates)
                .setHTML(description)
                .addTo(map);
        });

        map.on("mouseenter", "points", () => {
            map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "points", () => {
            map.getCanvas().style.cursor = "";
        });
    };

    return (
        <>
            <div className="map-wrapper">
                <MapboxMap onLoaded={onLoaded} />
            </div>
            {loading && <MapLoadingHolder />}
        </>
    );
};
