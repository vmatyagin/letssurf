type Location = {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
};

type User = {
    id: number;
    name: string;
    username: string | null;
    family_status: string;
    about: string;
    location: Location[];
};

export const getLocations = async (): Promise<User[]> => {
    return await fetch(`http://217.25.94.64/surfbot`).then((response) =>
        response.json()
    );
};
