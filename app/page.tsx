'use client';
import { useState } from "react";

export default function Home() {

  const [ shit, setShit ] = useState('');

  async function fetchResults() {
    const response = await fetch('/api/fetch-golfatx')
    const data = await response.json();
    setShit(JSON.stringify(data));
  }

  return (
    <div>{shit}
    <button onClick={() => fetchResults()}>Click me</button>
    </div>
  );
}
