import React, { useState } from "react";
import { NavLink } from "react-router-dom";

import { Button, Card, Tab, Tabs } from "ui-neumorphism";

const Header = () => {
  return (
    <Card className="pa-4" style={{ margin: "10px" }}>
      <div
       className="flex justify-between p-4"
      >
        <h1><b>Face Recognition</b></h1>
        <div className="flex gap-5">
          <NavLink to="/">
            <Button>ADD</Button>
          </NavLink>
          <NavLink to="/recognition">
            <Button>RECOGNISE</Button>
          </NavLink>
          <NavLink to="/attendance">
            <Button>ATTENDANCE</Button>
          </NavLink>
        </div>
      </div>
    </Card>
  );
};

export default Header;
