import { useState, useRef } from "react";
import { accountsApi } from "../api/social";

export default function PlaceSearchBar({ onResults, filters }) {

  const [queryText, setQueryText] = useState("");
  const [ACSuggestions, setACSuggestions] = useState([]); //list for dropdown selections
  const [showACSuggestions, setShowACSuggestions] = useState(false); //popup box to show suggestions
  const sessionTokenRef = useRef(null);

  const handleSearch = async (e, recommendationQuery = null) => {
    if (e?.preventDefault) e.preventDefault(); //if form submission from input, prevent page refresh. check e isnull then call i.e from handleRec, otherwise typeerror will be thrown

    const { Place } = await window.google.maps.importLibrary("places");

    let restrictionQuery = ""; //users' dietary restrictions (maybe should limit this to just recommendations? (this heavily influences searchbar atp)) ~ maybe add restriction toggle instead as well (handleRestrictions default true smth liddat)
    try {
      const results = await accountsApi.getProfile();
      const restrictions = results?.data.dietary_requirements
      if (restrictions !== null && restrictions !== undefined) {
        restrictionQuery = restrictions.join(" ");
      }
    } catch (error) {
      console.error("Error Getting Restrictions", error);
    }

    const preferences = filters?.preference?.length > 0 ? filters.preference.join(" ") : "";
    const minRate = filters?.rating || 0.5;

    const rawQuery = recommendationQuery ?? queryText; //check nullity on pass for search/recommend
    const filterQuery = preferences; //placeholder, base on filter add this to request, append dietary restrictions of user to the front of filter
    const finalQuery = rawQuery.toLowerCase().includes("food") //add more exclusions? (restaurant, cafe, bar, diner etc)
      ? `${restrictionQuery} ${filterQuery} ${rawQuery}`
      : `${restrictionQuery} ${filterQuery} ${rawQuery} food`; //improve query to match towards food-related search, change this another time?

    const request = { //make this dynamic, enable filter to change specific items in query here (more for recommendations)
      textQuery: finalQuery,
      fields: [ //fields wanted from the request (will have to change this to fit costs)
        "displayName",
        "location",
        "formattedAddress",
        "rating",
        "userRatingCount", //num user reviews
        "photos", //to decide on cost management
        "types",
        "reviews", //add reviews, to decide on cost management
      ],
      //includedType: "restaurant", this is limited to 1 type (typeA) only. easier to just not have this (let them search bicycles), filter typeB food returned results instead 
      //locationBias: { lat: 1.3521, lng: 103.8198 },
      //isOpenNow: true, //should probably include this as well so it restricts to currently avail restaurants? at most use as display would work as well
      language: "en-UK",
      minRating: minRate, //this is to filter out duds, but still include bad restaurants
      maxResultCount: 8, //can increase this for deployment, max 20 (but each consumes an API)
      region: "sg",
      //useStrictTypeFiltering: false,
      //priceLevels: [array of pricelevels]
    };

    try {
      const { places } = await Place.searchByText(request);
      onResults(places);
      setShowACSuggestions(false);
      sessionTokenRef.current = null; //deref ACsuggestions on handlesearch
    } catch (err) {
      console.error("Failed to get places", err);
      onResults([]);
      setShowACSuggestions(false);
      sessionTokenRef.current = null;
    }
  };

  const handleRecommendation = async () => {
    try {
      const results = await accountsApi.getProfile(); //*change this to getRecommendation and create a backend algorithm to shuffle recommendation based on dietary preferences instead
      const preferences = results?.data.dietary_preferences
      const recommendation = preferences !== null && preferences !== undefined
        ? `${preferences.join(" ")} highly recommended` //"popular" generates slightly different results as well
        : "highly recommended";
      handleSearch(null, recommendation);
    } catch (error) {
      console.error("Error Generating Recommendations", error);
    }
  }

  const handleSelectedAutoComplete = async (suggestion) => { 

    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: [
          "displayName",
          "location",
          "formattedAddress",
          "rating",
          "userRatingCount",
          "photos", 
          "types",
          "reviews",
        ],
      })
      onResults([place]); //foodlist uses map, need array (AC gives single result)
      setShowACSuggestions(false);
      sessionTokenRef.current = null;
    } catch (error) {
      console.error("Failed to get places", error);
      onResults([]);
      setShowACSuggestions(false);
      sessionTokenRef.current = null;
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch}
        style={{
          all: "unset",
          marginLeft: "12px",
          gap: "8px",
          alignItems: "center",
          display: "flex"
        }}>
        <input
          type="text"
          placeholder="Find Places..."
          style={{
            padding: "6px",
            fontSize: "16px",
            width: "70%",
            borderRadius: '8px'
          }}
          value={queryText}
          onChange={async (e) => {
            const currText = e.target.value;
            setQueryText(currText);
            setShowACSuggestions(true);

            if (!currText.trim()) { //empty string catch, else AC request throw error
              setACSuggestions([]);
              return;
            }

            const { AutocompleteSuggestion } = await window.google.maps.importLibrary("places");

            if (!sessionTokenRef.current) { //ref same token unless new session after fetchfields called
              const { AutocompleteSessionToken } = await window.google.maps.importLibrary("places");
              sessionTokenRef.current = new AutocompleteSessionToken();
            }

            const autocompleteRequest = {
              input: currText,
              language: "en-UK",
              region: "sg",
              sessionToken: sessionTokenRef.current
            }

            const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(autocompleteRequest);
            setACSuggestions(suggestions);
          }}
        />
        <button
          type="submit"
          title="Search"
          style={{
            padding: "6px",
            border: "none",
            backgroundColor: "white",
            cursor: "pointer"
          }}>
          🔍
        </button>

        <button
          type="button"
          title="Recommendation"
          onClick={handleRecommendation}
          style={{
            padding: "6px",
            border: "none",
            backgroundColor: "white",
            cursor: "pointer"
          }}>
          ✨
        </button>

        {showACSuggestions && ACSuggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "130px",
              left: "12px",
              backgroundColor: "white",
              border: "1px solid #ddd",
              borderRadius: "8px",
              zIndex: 2,
            }}>
            {ACSuggestions.map((suggestion) =>
              <div
                key={suggestion.placePrediction.placeId}
                onClick={() => handleSelectedAutoComplete(suggestion)}
                style={{ 
                  padding: "12px",
                  cursor: "pointer",
                  border: "1px solid #ddd"
                }}
              >
                {suggestion.placePrediction.text.text}
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}