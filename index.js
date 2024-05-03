let interval;

const loadLocations = async () => {
    const json = await fetch(`https://bot.letssurf.pro/surfbot`).then(
        (response) => response.json()
    );

    let counter = 1;
    return json.reduce((acc, user) => {
        if (user.username && user.location && user.location.length) {
            user.location.map((location) => {
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
            });
        }

        return acc;
    }, []);
};

const defaultAvatar =
    window.location.hostname === "localhost"
        ? "./assets/surfer.png"
        : "https://vmatyagin.github.io/letssurf/assets/surfer.png";

const createElement = () => {
    const el = document.createElement("div");
    el.classList.add("mapMarker");
    el.style.backgroundImage = "url('" + defaultAvatar + "')";
    return el;
};

const createCluster = (coords, count, onClick) => {
    const clusterElement = createElement();
    clusterElement.innerText = count;
    clusterElement.addEventListener("click", onClick);

    return new mapboxgl.Marker({
        element: clusterElement
    }).setLngLat(coords);
};

const createUser = (coords, description) => {
    return new mapboxgl.Marker({
        element: createElement()
    })
        .setLngLat(coords)
        .setPopup(
            new mapboxgl.Popup({ offset: 25 }) // add popups
                .setHTML(description)
        );
};

const createMap = async (mapboxgl) => {
    mapboxgl.accessToken =
        "pk.eyJ1Ijoidm1hdHlhZ2luIiwiYSI6ImNsdTJsdHE2cjA1MGQyb254OTU3bHo5aHEifQ.jsX73SwwLopH36s5ohxByg";
    const map = new mapboxgl.Map({
        container: "surf_map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [37.36, 55.45],
        zoom: 3,
        language: "ru"
    });

    const locations = await loadLocations();

    map.on("load", () => {
        map.addSource("usersGeojson", {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                id: "user-markers",
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
            source: "usersGeojson",
            layout: {
                "text-field": ["get", "name"],
                "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
                "text-offset": [0, 1.25],
                "text-anchor": "top",
                "text-size": 12
            }
        });

        const markers = {};
        let markersOnScreen = {};

        function updateMarkers() {
            let newMarkers = {};
            let features = map.querySourceFeatures("usersGeojson");
            console.warn("updateMarkers", features.length);

            for (const feature of features) {
                const coords = feature.geometry.coordinates;
                const props = feature.properties;

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
                                    zoom: map.getZoom() + 2,
                                    offset: [200, 0]
                                });
                            }
                        );
                    } else {
                        marker = markers[id] = createUser(
                            coords,
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
                    center: [37.36, 55.45],
                    zoom: 3
                });
                isInitialJumped = true;
            }
        });

        map.on("move", updateMarkers);
        map.on("moveend", updateMarkers);
        map.on("resize", updateMarkers);
        map.on("idle", updateMarkers);

        map.on("click", "points", (e) => {
            const coordinates = e.features[0].geometry.coordinates.slice();
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
    });
};

const start = () => {
    interval = setInterval(() => {
        if (window.mapboxgl) {
            clearInterval(interval);
            createMap(window.mapboxgl);
        }
    }, 250);
};

if (document.readyState !== "loading") {
    start();
} else {
    document.addEventListener("DOMContentLoaded", start);
}
