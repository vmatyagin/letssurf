import { useState, useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapboxMapProps {
    initialOptions?: Omit<mapboxgl.MapboxOptions, "container">;
    onCreated?(map: mapboxgl.Map): void;
    onLoaded?(map: mapboxgl.Map): void;
    onRemoved?(): void;
}

export const MapboxMap = ({
    initialOptions = {},
    onCreated,
    onLoaded,
    onRemoved
}: MapboxMapProps) => {
    const [, setMap] = useState<mapboxgl.Map>();

    const mapNode = useRef(null);

    useEffect(() => {
        const node = mapNode.current;

        if (typeof window === "undefined" || node === null) return;

        const mapboxMap = new mapboxgl.Map({
            container: node,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [37.36, 55.45],
            zoom: 3,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            language: "ru",
            accessToken:
                "pk.eyJ1Ijoidm1hdHlhZ2luIiwiYSI6ImNsdTJsdHE2cjA1MGQyb254OTU3bHo5aHEifQ.jsX73SwwLopH36s5ohxByg",
            ...initialOptions
        });

        if (mapboxMap.getZoom() < 4) {
            if (!document.body.classList.contains("zoomed")) {
                document.body.classList.add("zoomed");
            }
        }

        setMap(mapboxMap);
        if (onCreated) onCreated(mapboxMap);

        if (onLoaded) mapboxMap.once("load", () => onLoaded(mapboxMap));

        return () => {
            mapboxMap.remove();
            setMap(undefined);
            if (onRemoved) onRemoved();
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div ref={mapNode} style={{ width: "100%", height: "100%" }} />;
};
