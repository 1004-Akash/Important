import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AI_PROMPT, SelectBudgetOptions, SelectTravelsList } from '../constants/options';
import { toast, Toaster } from 'react-hot-toast';
import { chatSession } from '../service/AIModal';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button } from "@mui/material";
import { GoogleLogin } from "@react-oauth/google"; // Updated GoogleLogin import
import { useGoogleLogin } from "react-google-login";
import { doc, setDoc } from "firebase/firestore"; 



function CreateTrip() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [formData, setFormData] = useState({});
  const [locationDetails, setLocationDetails] = useState(null);  // State to store location details
  const [debounceTimeout, setDebounceTimeout] = useState(null);  // State for debounce timeout
  const [openDialog, setOpenDialog] = useState(false);
  const [loading,setLoading] = useState(false);
  // Create a ref for the destination input
  const destinationInputRef = useRef(null);

  const handleInputChange = (name, value) => {
    setFormData({ ...formData, [name]: value });  // Fixed to use formData instead of formField
  };

  useEffect(() => {
    console.log(formData); // Log the form data to debug
  }, [formData]);

   

   
  // Function to fetch location details using Location IQ API
  const fetchLocationDetails = async (location) => {
    const apiKey = 'pk.072cff9d533f1facf4b2f3c4eaf99db3';  // Location IQ API key

    const url =  `https://us1.locationiq.com/v1/search.php?key=${apiKey}&q=${location}&format=json`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log("API Response:", data); // Check the response

      if (data && data.length > 0) {
        setLocationDetails(data[0]);
      } else {
        toast.error('Location not found');
      }
    } catch (error) {
      console.error('Error fetching location details:', error);
      toast.error('Failed to fetch location details'); 
    }
  };

  const OnGenerateTrip = async () => {
    const user = localStorage.getItem("user");
    if (!user) {
      setOpenDialog(true);
      return;
    }
    setLoading(true);
      const FINAL_PROMPT = AI_PROMPT
        .replace('{location}', formData?.location?.label)
        .replace('{totalDays}', formData?.noOfDays)
        .replace('{traveler}', formData?.traveler)
        .replace('{budget}', formData?.budget)
        .replace('{totalDays}', formData?.noOfDays);
       
      
      console.log('Final Prompt:', FINAL_PROMPT);
      const result =await chatSession.sendMessage(FINAL_PROMPT);
      console.log("--",result?.response?.text());
      setLoading(false);
      SaveAiTrip(result?.response?.text());
  };
  
  const SaveAiTrip=async(TripData)=>
  {   setLoading(true);
      const user=JSON.parse(localStorage.getItem('user'));
      const docId=Date.now().toString()

    // Add a new document in collection "cities"
    await setDoc(doc(db, "AITrips", docId), {
     userSelection:formData,
     tripData:TripData,
     userEmail:user?.email,
     id:docId
    }); 
    setLoading(false);
  }
  
  

  // Handle change for destination input
  const handleDestinationChange = (e) => {
    const value = e.target.value;
    setDestination(value);
    handleInputChange('location', { label: value }); // Storing the label for location

    // Clear the previous timeout
    if (debounceTimeout) clearTimeout(debounceTimeout);

    // Set a new timeout for debounce
    const newTimeout = setTimeout(() => {
      if (value.trim()) {
        fetchLocationDetails(value);  // Fetch location details from Location IQ API
      }
    }, 500);  // Adjust debounce delay as needed (in ms)

    setDebounceTimeout(newTimeout);  // Store the timeout ID
  };
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => GetUserProfile(tokenResponse),
    onError: (error) => console.log( error)
  })
  const GetUserProfile=(tokenInfo)=>
  {
    axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenInfo?.access_token}`, {
      headers: {
        Authorization: `Bearer ${tokenInfo?.access_token}`,  // Fix typo in Authorization
        Accept: 'Application/json'
      }
    }).then((resp) => {
      console.log(resp.data);
      localStorage.setItem('user',JSON.stringify(resp.data));
      setOpenDialog(false);
      OnGenerateTrip();

    }) 
    
  }

  return (
    <div className="sm:px-10 md:px-32 lg:px-56 xl:px-10 px-5 mt-10">
      <h2 className="font-bold text-3xl">Tell us your travel experiences 🏕🌴</h2>
      <p className="mt-3 text-gray-500 text-xl">
        Provide some basic information, and our trip planner will generate a customized itinerary for you.
      </p>

      <div className="mt-20 flex flex-col gap-10">
        <div className="space-y-3">
          <h2 className="text-xl my-3 font-medium">What is the destination of choice?</h2>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Type your destination"
            value={destination}
            onChange={handleDestinationChange} // Call the new function here
            ref={destinationInputRef}  // Set the ref to the input
          />
          {locationDetails && (
            <div className="mt-3">
              <h3 className="font-semibold">Location Details:</h3>
              <p>{locationDetails.display_name}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-xl my-3 font-medium">How many days are you planning your trip?</h2>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Ex. 3"
            onChange={(e) => handleInputChange('noOfDays', Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl my-3 font-medium">What is Your Budget?</h2>
        <div className="grid grid-cols-3 gap-5 mt-5">
          {SelectBudgetOptions.map((item, index) => (
            <div
              key={index}
              onClick={() => handleInputChange('budget', item.title)}
              className={`p-4 border cursor-pointer rounded-lg hover:shadow-lg ${
                formData?.budget === item.title && 'shadow-lg border-black'
              }`}
            >
              <h2 className="text-4xl">{item.icon}</h2>
              <h2 className="font-bold text-lg">{item.title}</h2>
              <h2 className="text-sm text-gray-500">{item.desc}</h2>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl my-3 font-medium">Who do you plan on traveling with for your next adventure?</h2>
        <div className="grid grid-cols-3 gap-5 mt-5">
          {SelectTravelsList.map((item, index) => (
            <div
              key={index}
              onClick={() => handleInputChange('traveler', formData.traveler === item.people ? '' : item.people)}
              className={`p-4 border cursor-pointer rounded-lg hover:shadow-lg ${
                formData?.traveler === item.people && 'shadow-lg border-black'
              }`}
            >
              <h2 className="text-4xl">{item.icon}</h2>
              <h2 className="font-bold text-lg">{item.title}</h2>
              <h2 className="text-sm text-gray-500">{item.desc}</h2>
            </div>
          ))}
        </div>
      </div>

      <div className="my-10 justify-end flex">
        <button
          className="bg-black text-white py-2 px-4 rounded-lg"
          onClick={OnGenerateTrip}
        >
          Generate Trip
        </button>
      </div>
            {/* Google Login Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Sign In</DialogTitle>
        <DialogContent>
          <p>Sign in to the App with Google authentication secure</p>
          <GoogleLogin
            onSuccess={(response) => console.log(response)}
            onError={(error) => console.log(error)}
            useOneTap
          />
         <Button disabled={loading} onClick={() => login()} className="w-full mt-5 flex gap-4 items-center">
  <>Sign In With Google</>
</Button>

        </DialogContent>
        <DialogActions>{/* Optional Actions */}</DialogActions>
      </Dialog>


      <Toaster position="top-center" />
    </div>

  );
}

export default CreateTrip;
