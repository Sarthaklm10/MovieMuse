import { useState, useEffect } from "react";

export default function useLocalStorage(initialValue, key) {

    const [value, setValue] = useState(() => {
        const storedValue = localStorage.getItem(key)

        return storedValue ? JSON.parse(storedValue) : initialValue
    })
    useEffect(
        function () {
            localStorage.setItem(key, JSON.stringify(value))
        }, [value, key]
    )
    return [value, setValue]
}