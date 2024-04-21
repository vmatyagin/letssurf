let interval;

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

    const url = `https://matyagin.ru/surfbot`;

    const json = await fetch(url).then((response) => response.json());

    let counter = 1;
    const locations = json.reduce((acc, user) => {
        if (user.username && user.location && user.location.length) {
            user.location.map((location) => {
                acc.push({
                    id: counter,
                    lat: location.latitude,
                    lon: location.longitude,
                    name: location.name,
                    tg: user.username,
                    username: user.name,
                    userAbout: user.about
                });
                counter++;
            });
        }

        return acc;
    }, []);

    // console.log(locations);

    const defaultAvatar =
        window.location.hostname === "localhost"
            ? "./assets/surfer.png"
            : "https://vmatyagin.github.io/letssurf/assets/surfer.png";

    const mapSource = {
        type: "FeatureCollection",
        id: "user-markers",
        features: locations.map((location) => ({
            type: "Feature",
            properties: {
                id: location.id,
                url: `https://t.me/${location.tg.replace("@", "")}`,
                avatar: defaultAvatar,
                name: location.name.length
                    ? `${location.username} - ${location.name}`
                    : location.username,
                description: `<strong>${location.username}</strong> - <a target="_blank" href="https://t.me/${location.tg}">Telegram<a/><p>${location.userAbout}</p>`
            },
            geometry: {
                type: "Point",
                coordinates: [location.lon, location.lat]
            }
        }))
    };

    let markers = {};
    let markersOnScreen = {};

    function updateMarkers() {
        let newMarkers = {};
        let features = map.querySourceFeatures("usersGeojson");

        for (let i = 0; i < features.length; i++) {
            const coords = features[i].geometry.coordinates;
            const props = features[i].properties;
            const id = props.cluster_id || props.id;

            let marker = markers[id];
            if (!marker) {
                if (props.cluster) {
                    // it's a cluster
                    let clusterElement = document.createElement("div");
                    clusterElement.classList.add("mapCluster");
                    clusterElement.innerText = props.point_count;
                    const clusterAvatar = getClusterAvatar(coords);
                    clusterElement.style.backgroundImage =
                        "url('" + avatarOrDefault(clusterAvatar) + "')";
                    marker = new mapboxgl.Marker({
                        element: clusterElement
                    }).setLngLat(coords);
                    clusterElement.addEventListener("click", function () {
                        map.flyTo({
                            center: coords,
                            zoom: map.getZoom() + 2,
                            offset: [200, 0]
                        });
                    });
                } else {
                    let markerElement = document.createElement("div");
                    markerElement.classList.add("mapMarker");
                    markerElement.style.backgroundImage =
                        "url('" + avatarOrDefault(props.avatar) + "')";
                    marker = new mapboxgl.Marker({
                        element: markerElement
                    })
                        .setLngLat(coords)
                        .setPopup(
                            new mapboxgl.Popup({ offset: 25 }) // add popups
                                .setHTML(props.description)
                        )
                        .addTo(map);
                }
            }
            newMarkers[id] = marker;
            markers[id] = marker;

            if (!markersOnScreen[id]) marker.addTo(map);
        }

        // remove old markers from map
        for (let id in markersOnScreen) {
            if (!newMarkers[id]) markersOnScreen[id].remove();
        }
        markersOnScreen = newMarkers;
    }

    function getClusterAvatar(coordinates) {
        let pointPixels = map.project(coordinates);
        const avatarFeature = mapSource.features.find(function (el) {
            if (!el.properties.avatar || el.properties.avatar === "null")
                return;
            let elPixels = map.project(el.geometry.coordinates);
            let pixelDistance = Math.sqrt(
                Math.pow(elPixels.x - pointPixels.x, 2) +
                    Math.pow(elPixels.y - pointPixels.y, 2)
            );
            return Math.abs(pixelDistance) <= 20;
        });
        return avatarFeature ? avatarFeature.properties.avatar : defaultAvatar;
    }

    function avatarOrDefault(avatar) {
        return avatar && avatar !== "null" ? avatar : defaultAvatar;
    }
    map.on("load", () => {
        map.addSource("usersGeojson", {
            type: "geojson",
            data: mapSource,
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

        updateMarkers();

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

    map.on("data", function (e) {
        if (e.sourceId !== "usersGeojson" || !e.isSourceLoaded) {
            return;
        }
        map.on("move", updateMarkers);
        map.on("moveend", updateMarkers);
        updateMarkers();
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
