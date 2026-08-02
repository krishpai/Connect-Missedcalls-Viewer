import React, { useState } from "react";
import { apiRequest } from "../authConfig";
import { DateRangeSelector } from "./DateRangeSelector";
import { Box, Stack, Typography, Button, FormControl, RadioGroup, FormControlLabel, Radio } from "@mui/material";
import { useAcquireTokenWithRecovery } from "../hooks/useAcquireTokenWithRecovery";

const API_ENDPOINT_ENTRA_AUTH = import.meta.env.VITE_API_URL_ENTRA_AUTH;
const API_ENDPOINT_CONNECT_AUTH = import.meta.env.VITE_API_URL_CONNECT_AUTH;

interface SearchBoxProps {
  userName: string;
  entraAuth: boolean;
  onSearchResultChange: (value: string) => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ userName, entraAuth, onSearchResultChange }) => {


  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchFailedNoMessages, setSearchFailedNoMessages] = useState<boolean>(false);
  const [searchFailedServerOverloaded, setSearchFailedServerOverloaded] = useState<boolean>(false);
  const [queryType, setQueryType] = useState<string>("New");
  const [loading, setLoading] = useState<boolean>(false);

  const acquireTokenWithRecovery = useAcquireTokenWithRecovery();

  const searchClicked = async () => {
    setLoading(true);
    setSearchFailedNoMessages(false);
    setSearchFailedServerOverloaded(false);

    function formatDate(dateStr: string): string {
      const [year, month, day] = dateStr.split("-");
      return `${month}${day}${year}`;
    }
    let apiUrl;

    if (entraAuth)
      apiUrl = `${API_ENDPOINT_ENTRA_AUTH}?function_code=fetch_missed_calls_records&username=${userName}&start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}&query_type=${queryType}`;
    else
      apiUrl = `${API_ENDPOINT_CONNECT_AUTH}?function_code=fetch_missed_calls_records&username=${userName}&start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}&query_type=${queryType}`;

    console.log("apiUrl: " + apiUrl)
    let accessToken: string = "none";

    try {
      if (entraAuth) {
        const authResult = await acquireTokenWithRecovery({
          ...apiRequest
        });
        accessToken = authResult?.accessToken ?? "none";
      }

      if (accessToken) {
        const response = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
          setSearchFailedServerOverloaded(true);
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.row_count > 0) {
          onSearchResultChange(JSON.stringify(data["rows"]));
        }
        else {
          setSearchFailedNoMessages(true);
          onSearchResultChange("");
        }
      }
    }
    catch (e) {
      console.log(e);
      onSearchResultChange("");
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "1000px", // Limits the spread on ultra-wide monitors
        margin: "0 auto",   // Centers the entire component on the screen
        p: 3
      }}
    >

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={4}
        alignItems="flex-start"
        justifyContent="center"
        sx={{ width: "100%", mb: 2 }}
      >
        <DateRangeSelector
          onStartDateChange={(val) => setStartDate(val)}
          onEndDateChange={(val) => setEndDate(val)}
        />

      </Stack>

      {/* Bottom Section: Action Button & Feedback 
      */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center"
        }}
      >
        <FormControl sx={{ mb: 1, alignItems: "center" }}>
          <RadioGroup row aria-labelledby="query-type-label" name="queryType" value={queryType} onChange={(e) => setQueryType(e.target.value)} >
            <FormControlLabel value="Self" control={<Radio />} label="Self" />
            <FormControlLabel value="Queue" control={<Radio />} label="Queue" />
            <FormControlLabel value="All" control={<Radio />} label="All" />
          </RadioGroup>
        </FormControl>
        <Button variant="contained" size="large" onClick={searchClicked} disabled={loading} sx={{ minWidth: "150px", borderRadius: "8px" }}>
          {loading ? "Fetching..." : "Retrieve Missed Calls"}
        </Button>

        {loading && (
          <Typography sx={{ mt: 2, color: "text.secondary", fontStyle: "italic" }}>
            Please wait, communicating with server...
          </Typography>
        )}

        {!loading && searchFailedNoMessages && (
          <Typography color="error" sx={{ mt: 2, fontWeight: 500 }}>
            No missed calls found for the selected criteria.
          </Typography>
        )}
        {!loading && searchFailedServerOverloaded && (
          <Typography color="error" sx={{ mt: 2, fontWeight: 500 }}>
            Search timed out. Narrow the date range or select one region.
          </Typography>
        )}
      </Box>
    </Box>
  );
};