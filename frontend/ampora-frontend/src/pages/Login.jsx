import React from 'react'
import Loginimg from "../assets/Loginimg.png";


export default function Login() {
  return (
    <div className="min-h-screen w-screen bg-green-100  flex justify-center items-center  fixed top-0 right-0 left-0">
      <div className="border border-indigo-500  w-[889px] h-[789px] flex flex-row gap-32 ">
        <div className="w-[381px] h-[889px] border border-purple-500  shadow-md "  >
               <img 
                src={Loginimg} 
                alt="Login" 
                className="w-full h-full object-cover rounded-2xl"
              />
           </div>
           <div className="w-[381px] h-[889px] bg-amber-300 border border-sky-500  rounded-2xl shadow-md">
                  hellooo

           </div>
      </div>
           
      
     
    </div>
  )
}
