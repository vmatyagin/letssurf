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
    return await fetch(`https://matyagin.ru/surfbot`).then((response) =>
        response.json()
    );
};
