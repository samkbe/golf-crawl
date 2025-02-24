"use client";
import { useState, useEffect } from "react";
import { TeeTime } from "../types";

export default function Page() {
    const [state, setState] = useState<TeeTime[] | undefined>(undefined);

    // useEffect(() => {

    //     fetchIt();
    // }, []);

    async function fetchIt() {
    const response = await fetch("/api");
    if (response.ok) {
        const val = await response.json();
        setState(val);
    }
}

    return (
        <div>
            <h1>Fetching Tee Times for Tomorrow:</h1>
            {state ? (
                <>
                <ul>
                    {state.map((teeTime, index) => (
                        <li key={index}>
                            {teeTime.courseName} at {JSON.stringify(teeTime.date)}
                        </li>
                    ))}
                </ul>
                </>
            ) : (
                <p>Loading...</p>
            )}
            <button onClick={() => fetchIt()}>FETCH</button>
        </div>
    );
}