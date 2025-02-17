'use client';
import { useState } from "react";

export default function Home() {

  const [ shit, setShit ] = useState('');

  async function handleSubmit() {
    const response = await fetch('/api/fetch-golfatx')
    const data = await response.json();
    setShit(JSON.stringify(data));
  }


  return (
    <div>
      <form action={handleSubmit}>
        <label htmlFor="date">Date:</label>
        <input id="date" name="date" type="date" required />
        <button type="submit">Find Tee Times</button>
      </form>
      <div className="flex flex-wrap m-auto">
        {shit}
      </div>
    </div>
  );
}
