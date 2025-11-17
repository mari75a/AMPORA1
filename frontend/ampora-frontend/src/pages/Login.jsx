import React from 'react'
import Loginimg from "../assets/Loginimg.png";
import 


export default function Login() {
  return (
    // Main-Wrapper
    <div className="min-h-screen w-screen bg-[#EDFEFF] flex justify-center items-center  fixed top-0 right-0 left-0">
      <div className="bg-[#EDFEFF] w-[800px] h-[700px] flex flex-row gap-10 shadow-2xl overflow-hidden">

        {/* Login-Image */}
        <div className="w-[381px] h-full shadow-xl/30"  >
               <img 
                src={Loginimg} 
                alt="Login" 
                className="w-full h-full object-cover rounded-2xl"
              />
           </div>

           {/* Login-Form */}
           <div className="w-[381px] h-full rounded-2xl shadow-xl/30 bg-gray-100 p-10 flex flex-col">
                  <h3 class="font-inter font-bold text-[36px] text-[#000000] text-center mt-4">Welcome Back</h3>

                  <div className='flex flex-row gap-7 p-4 ml-5' >
                      <p> New user</p>
                      <p className='text-[#0D9489]'>| Create an Account</p>
                 
                  </div>
                 
                  {/* Google Login */}
                  <button className="w-[235px] h-[35px] flex items-center justify-center gap-2 p-6 ml-9">
                      <img
                           src="https://www.svgrepo.com/show/355037/google.svg"
                           alt="Google"
                          className="w-5"
                      />Sign in with Google
                  </button> 
                  
                  <p className="text-center font-[400px] font-inter text-gray-500 p-3">Or sign with email</p>

                  <form className='flex flex-col items-center p-6' >
                      {/* Email */}
                      <input
                            type="email"
                            placeholder="Email Address"
                            className="w-[300px] h-[50px]  border border-gray-500 rounded-2xl px-4 mb-4 in-focus-visible: "
                      />

                      {/* Password */}
                      <input
                            type="password"
                            placeholder="Password"
                            className="w-[300px] h-[50px] border border-gray-500 rounded-2xl px-4 mb-4 "
              
                      />

                      <div className="flex flex-row gap-8 w-[381px] pl-12 mt-2">
                          <label className="flex items-center gap-2">
                          <input type="checkbox" />
                              Remember me
                          </label> 
                          <a href="/forgot" className='text-[black]'>
                              Forgot Password?
                          </a>
                      </div>

                      {/* Login Button */}
                      <button
                        type="submit"
                        className="w-[300px] h-[50px]  text-black font-semibold rounded-lg ml-3 mt-7"
                      >
                        Login
                      </button>
                  </form>
   
           </div>
      </div>
           
      
     
    </div>
  )
}
