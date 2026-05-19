import React, { useState } from "react";
import axios from "axios";
import Header from "./Header";
import {
  Button,
  Card,
  TextField,
  ListItem,
  ListItemGroup,
} from "ui-neumorphism";

const AttendancePage = () => {
  const [date, setDate] = useState("");
  const [records, setRecords] = useState([]);

  const fetchAttendance = async () => {
    if (!date) {
      alert("Please select a date.");
      return;
    }

    try {
      const response = await axios.get(
        `http://localhost:5000/attendance?date=${date}`
      );
      setRecords(response.data);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      alert("Failed to fetch attendance. Please try again.");
    }
  };

  return (
    <div>
      <div>
        <div>
          <Header />
        </div>
        <div className="flex justify-between">
          <div className="w-600">
            <Card className="m-10 w-fit pa-5">
              <ListItemGroup>
                {records.length === 0 ? (
                  <ListItem>No records found for the selected date.</ListItem>
                ) : (
                  records.map((record, index) => (
                    <ListItem key={index}>
                      <b>{record.name}</b> 
                    </ListItem>
                  ))
                )}
              </ListItemGroup>
            </Card>
          </div>
          <div className="flex flex-col m-5 ">
            <Card className="m-5">
              <input
                className="p-7"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />{" "}
            </Card>

            <Button className=" mr-5" onClick={fetchAttendance}>
              Get Attendance
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
