import React from 'react'
import {RouterProvider,createBrowserRouter} from "react-router-dom";
import AttendancePage from './components/AttendancePage'
import RecognitionPage from './components/RecognitionPage'
import AddUserPage from './components/AddUserPage'

const App = () => {
  const router=createBrowserRouter([
    {
      path:"/",
      element:<AddUserPage/>
    },
    {
      path:"/attendance",
      element:<AttendancePage/>
    },
    {
      path:"/recognition",
      element:<RecognitionPage/>
    }
  ])
  return (
    <div>
      <RouterProvider router={router}/>
    </div>
  )
}

export default App
