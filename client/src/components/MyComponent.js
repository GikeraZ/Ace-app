// Example Component: MyComponent.js
import React, { useState, useEffect } from 'react';
import app from '../firebase'; // Import the initialized app
import { getFirestore, collection, getDocs } from 'firebase/firestore'; // Import specific service

const MyComponent = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const db = getFirestore(app); // Get Firestore instance linked to your app
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "some_collection"));
      const docsArray = [];
      querySnapshot.forEach((doc) => {
        docsArray.push({ id: doc.id, ...doc.data() }); // Add document ID
      });
      setData(docsArray);
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>Fetched Data</h1>
      {data.map(item => <div key={item.id}>{item.name}</div>)}
    </div>
  );
};

export default MyComponent;
