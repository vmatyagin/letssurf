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

    const sheetId = "1Edy0_vI_vObETD96SI-FnRJqtNuPy0dVu64kl-_CsE0";
    const sheetGid = "1816724719";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&tq&gid=${sheetGid}`;

    const json = await fetch(url)
        .then((response) => response.text())
        .then((data) => JSON.parse(data.substring(47, data.length - 2)));

    const rows = json.table.rows;
    const users = rows.reduce((users, row, index) => {
        if (index > 1 && row.c[0] !== null) {
            const lat = row.c[0].v;
            const lon = row.c[1].v;
            const tg = row.c[3].v;
            const name = row.c[4].v;
            users.push({ lat, lon, tg, name });
        }
        return users;
    }, []);

    console.log(users);

    const defaultAvatar = "./assets/surfer.png";

    const mapSource = {
        type: "FeatureCollection",
        id: "user-markers",
        features: users.map((user) => ({
            type: "Feature",
            properties: {
                id: user.tg,
                url: `https://t.me/${user.tg.replace("@", "")}`,
                avatar: defaultAvatar
            },
            geometry: {
                type: "Point",
                coordinates: [user.lon, user.lat]
            }
        }))
    };

    map.addSource("usersGeojson", {
        type: "geojson",
        data: mapSource,
        cluster: true,
        clusterRadius: 25
    });
    map.addLayer({
        id: "users",
        type: "circle",
        source: "usersGeojson",
        filter: ["!=", "cluster", true],
        paint: {
            "circle-opacity": 0.0
        },
        layout: {
            "text-field": ["get", "title"]
        }
    });

    map.addLayer({
        id: "points",
        type: "symbol",
        source: "usersGeojson",
        layout: {
            "icon-image": "custom-marker"
        }
    });

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
                    clusterElement.classList.add("people-map-user-cluster");
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
                    // it's a normal marker
                    let markerElement = document.createElement("a");
                    markerElement.href = props.url;
                    markerElement.target = "_blank";
                    markerElement.classList.add("people-map-user-marker");
                    markerElement.style.backgroundImage =
                        "url('" + avatarOrDefault(props.avatar) + "')";
                    marker = new mapboxgl.Marker({
                        element: markerElement
                    }).setLngLat(coords);
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

    map.on("data", function (e) {
        if (e.sourceId !== "usersGeojson" || !e.isSourceLoaded) {
            return;
        }
        map.on("move", updateMarkers);
        map.on("moveend", updateMarkers);
        updateMarkers();
    });

    setTimeout(() => {
        updateMarkers();
    }, 1000);
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
