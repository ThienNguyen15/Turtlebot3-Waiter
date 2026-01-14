#include "turtlebot3_firebase.hpp"

firebase::App* firebase_app;
const char *databasePath = "turtlebot_state";
const char *requestPath = "request";

const char *api_key = "AIzaSyD3m-cPZIxZwK59Y8q1HCLxWVOf0qVHSjQ";
const char *app_id = "1:419978511119:android:eb17bcb42e9438e41cf47a";
const char *database_url = "https://turtlebot3-3bd17-default-rtdb.asia-southeast1.firebasedatabase.app";
const char *storage_bucket = "turtlebot3-3bd17.appspot.com";
const char *project_id = "turtlebot3-3bd17";

firebase::AppOptions options;
int numberOfStation = 0;

void InitializeFirebase()
{
    options.set_api_key(api_key);
    options.set_app_id(app_id);
    options.set_database_url(database_url);
    options.set_storage_bucket(storage_bucket);
    options.set_project_id(project_id);

    firebase_app = firebase::App::Create(options);
    if (!firebase_app)
    {
        std::cerr << "Failed to initialize Firebase app." << std::endl;
    }
}


void WaitForCompletion(const firebase::FutureBase &future, const char *name){
     while (future.status() == firebase::kFutureStatusPending)
    {
    }
    if (future.status() != firebase::kFutureStatusComplete)
    {
        printf("ERROR: %s returned an invalid result.\n", name);
    }
    else if (future.error() != 0)
    {
        printf("ERROR: %s returned error %d: %s\n", name, future.error(),
               future.error_message());
    }
}

void SetBattery(int value){
  // Ensure that the Firebase app is initialized.
    if (!firebase_app)
    {
        std::cerr << "Firebase app is not initialized." << std::endl;
        // Handle error as needed.
        return;
    }

    // Get a reference to the Firebase Realtime Database.
    firebase::database::Database *database = firebase::database::Database::GetInstance(firebase_app);
    if (!database)
    {
        std::cerr << "Failed to get the database instance." << std::endl;
        // Handle error as needed.
        return;
    }

    // Get a reference to the database location where you want to publish the value.
    firebase::database::DatabaseReference reference = database->GetReference(databasePath);
    // Set the value at the specified location.
    auto future = reference.Child("battery").SetValue(value);
    WaitForCompletion(future, "set");
}

void isReachStation(int value){
  // Ensure that the Firebase app is initialized.
    if (!firebase_app)
    {
        std::cerr << "Firebase app is not initialized." << std::endl;
        // Handle error as needed.
        return;
    }

    // Get a reference to the Firebase Realtime Database.
    firebase::database::Database *database = firebase::database::Database::GetInstance(firebase_app);
    if (!database)
    {
        std::cerr << "Failed to get the database instance." << std::endl;
        // Handle error as needed.
        return;
    }

    // Get a reference to the database location where you want to publish the value.
    firebase::database::DatabaseReference reference = database->GetReference(databasePath);
    // Set the value at the specified location.
    auto future = reference.Child("isReachStation").SetValue(value);
    WaitForCompletion(future, "set");
}

int GetBattery(){
       // Ensure that the Firebase app is initialized.
    if (!firebase_app)
    {
        std::cerr << "Firebase app is not initialized." << std::endl;
        // Handle error as needed.
        return -1;
    }

    // Get a reference to the Firebase Realtime Database.
    firebase::database::Database *database = firebase::database::Database::GetInstance(firebase_app);
    if (!database)
    {
        std::cerr << "Failed to get the database instance." << std::endl;
        // Handle error as needed.
        return -1;
    }

    // Get a reference to the database location where you want to publish the value.
    firebase::database::DatabaseReference reference = database->GetReference(databasePath);
    // Get the value at the specified location.
    firebase::Future<firebase::database::DataSnapshot> result = reference.Child("battery").GetValue();
    WaitForCompletion(result, "get");
    const firebase::database::DataSnapshot snapshot = *result.result();
    return snapshot.value().int64_value();
} 

// getRequestData getRequest(){
//     // Ensure that the Firebase app is initialized.
//     getRequestData myRequest;
//     myRequest.id = 1;
//     if (!firebase_app)
//     {
//         std::cerr << "Firebase app is not initialized." << std::endl;
//         myRequest.id = -1;
//         // Handle error as needed.
//         return myRequest;
//     }
//        // Get a reference to the Firebase Realtime Database.
//     firebase::database::Database *database = firebase::database::Database::GetInstance(firebase_app);

//     if (!database)
//     {
//         std::cerr << "Failed to get the database instance." << std::endl;
//         myRequest.id = -1;
//         // Handle error as needed.
//         return myRequest;
//     }
//      // Get the root reference location of the database.
//     firebase::database::DatabaseReference dbref = database->GetReference(requestPath);
//     firebase::Future<firebase::database::DataSnapshot> result = dbref.GetValue();
//     WaitForCompletion(result, "get");
//     const firebase::database::DataSnapshot myID = *result.result();
//     //check field of id whether exist or not 
//     if(!(myID.HasChild("id"))){
//         std::cerr << "Don't have this field id" << std::endl;
//     }
//     // check value of id whether null or not
//     if(!(myID.Child("id").value().is_null())){
//         std::cerr << "Value is not null" << std::endl;
//     }
//         //check the field of x and y of the param whether exist or not 
//     if(!(myID.Child("param").HasChild("x")) &&  !(myID.Child("param").HasChild("y"))){
//         std::cerr << "Don't have this field x and y" << std::endl;
//     }
//     // check value of x whether null or not
//     if(!(myID.Child("param").Child("x").value().is_null())){
//         std::cerr << "Value is not null" << std::endl;
//     }
//     // check value of y whether null or not
//     if(!(myID.Child("param").Child("y").value().is_null())){
//         std::cerr << "Value is not null" << std::endl;
//     }
//     //debug
//     // std::cerr << myID.Child("id").value().int64_value()<< std::endl;
//     // std::cerr << myID.Child("param").Child("x").value().int64_value()<< std::endl;
//     // std::cerr << myID.Child("param").Child("y").value().int64_value()<< std::endl;
//     //Assign a value to the variable myRequest
//     myRequest.id = myID.Child("id").value().int64_value();
//     firebase::Variant x = myID.Child("param").Child("x").value();
//     firebase::Variant y = myID.Child("param").Child("y").value();
//     firebase::Variant yaw = myID.Child("param").Child("yaw").value();
//     myRequest.xPosition = (x.is_int64()) ? x.int64_value() : x.double_value();
//     myRequest.yPosition = (y.is_int64()) ? y.int64_value() : y.double_value();
//     myRequest.yPosition = (yaw.is_int64()) ? yaw.int64_value() : yaw.double_value();
//     return myRequest; 
// }

// getPositionData getPosition(){
//     //initialize positionData variable 
//     getPositionData myPosition;
//     myPosition.xPosition = 0.0;
//     myPosition.yPosition = 0.0;
//    // Ensure that the Firebase app is initialized.
//     if (!firebase_app)
//     {
//         std::cerr << "Firebase app is not initialized." << std::endl;
//         myPosition.xPosition = -1;
//         myPosition.yPosition = -1;
//         // Handle error as needed.
//         return myPosition;
//     }
//        // Get a reference to the Firebase Realtime Database.
//     firebase::database::Database *database = firebase::database::Database::GetInstance(firebase_app);

//     if (!database)
//     {
//         std::cerr << "Failed to get the database instance." << std::endl;
//         myPosition.xPosition = -1;
//         myPosition.yPosition = -1;
//         // Handle error as needed.
//         return myPosition;
//     }
//      // Get the root reference location of the database.
//     firebase::database::DatabaseReference dbref = database->GetReference(databasePath);
//     firebase::Future<firebase::database::DataSnapshot> result = dbref.Child("position").GetValue();
//     WaitForCompletion(result, "get");
//     const firebase::database::DataSnapshot myResult = *result.result();
//     //check field of id whether exist or not 
//     if(!(myResult.HasChild("x"))){
//         std::cerr << "Don't have this field x" << std::endl;
//     }
//     if(!(myResult.HasChild("y"))){
//         std::cerr << "Don't have this field y" << std::endl;
//     }
//     // check value of x whether null or not
//     if(!(myResult.Child("x").value().is_null())){
//         std::cerr << "Value's x is not null" << std::endl;
//     }
//     if(!(myResult.Child("y").value().is_null())){
//         std::cerr << "Value's y is not null" << std::endl;
//     }
//     //Assign a value to the variable myRequest
//     myPosition.xPosition = myResult.Child("x").value().double_value();
//     myPosition.yPosition = myResult.Child("y").value().double_value();
//     return myPosition; 
// }

void setPosition(double x, double y, double yaw){
    // Ensure that the Firebase app is initialized.
    if (!firebase_app)
    {
        std::cerr << "Firebase app is not initialized." << std::endl;
        // Handle error as needed.
        return;
    }

    // Get a reference to the Firebase Realtime Database.
    firebase::database::Database *database = firebase::database::Database::GetInstance(firebase_app);
    if (!database)
    {
        std::cerr << "Failed to get the database instance." << std::endl;
        // Handle error as needed.
        return;
    }

    // Get a reference to the database location where you want to publish the value.
    firebase::database::DatabaseReference reference = database->GetReference(databasePath);
    // Set the value at the specified location.
    auto future = reference.Child("position").Child("x").SetValue(x);
    WaitForCompletion(future, "set");
    auto future1 = reference.Child("position").Child("y").SetValue(y);
    WaitForCompletion(future1, "set");
    auto future2 = reference.Child("position").Child("yaw").SetValue(yaw);
    WaitForCompletion(future1, "set");
}

void setStatus(bool value){
     // Ensure that the Firebase app is initialized.
    if (!firebase_app)
    {
        std::cerr << "Firebase app is not initialized." << std::endl;
        // Handle error as needed.
        return;
    }

    // Get a reference to the Firebase Realtime Database.
    firebase::database::Database *database = firebase::database::Database::GetInstance(firebase_app);
    if (!database)
    {
        std::cerr << "Failed to get the database instance." << std::endl;
        // Handle error as needed.
        return;
    }

    // Get a reference to the database location where you want to publish the value.
    firebase::database::DatabaseReference reference = database->GetReference(databasePath);
    // Set the value at the specified location.
    auto future = reference.Child("isFree").SetValue(value);
    WaitForCompletion(future, "set");
}

// stationData getStation(){
//     stationData myStation;
//     myStation.description= "NO DESTINATION";
//     myStation.id = -1;
//     myStation.nameStation = "NO NAME";
//     // myStation.multipleStation = "No stattion";
//      // Ensure that the Firebase app is initialized.
//     if (!firebase_app)
//     {
//         std::cerr << "Firebase app is not initialized." << std::endl;
//         // Handle error as needed.
//         return myStation;
//     }

//     // Get a reference to the Firebase Realtime Database.
//     firebase::database::Database *database = firebase::database::Database::GetInstance(firebase_app);
//     if (!database)
//     {
//         std::cerr << "Failed to get the database instance." << std::endl;
//         // Handle error as needed.
//         return myStation;
//     }

//  // Get the root reference location of the database.
//     firebase::database::DatabaseReference dbref = database->GetReference(requestPath);
//     firebase::Future<firebase::database::DataSnapshot> result = dbref.GetValue();
//     WaitForCompletion(result, "get");
//     const firebase::database::DataSnapshot station = *result.result();
//         //check the field of x and y of the param whether exist or not 
//     if(!(station.Child("station").HasChild("description")) &&  !(station.Child("station").HasChild("id")) && !(station.Child("station").HasChild("name"))){
//         std::cerr << "Don't have this field" << std::endl;
//     }
//     // check value of x whether null or not
//     if(!(station.Child("station").Child("description").value().is_null())){
//         std::cerr << "description's value is not null" << std::endl;
//     }
//     // check value of y whether null or not
//     if(!(station.Child("station").Child("id").value().is_null())){
//         std::cerr << "id's value is not null" << std::endl;
//     }
//     if(!(station.Child("station").Child("name").value().is_null())){
//         std::cerr << "name's value is not null" << std::endl;
//     }
//     //debug
//     std::cerr << station.Child("station").Child("description").value().string_value()<< std::endl;
//     std::cerr << station.Child("station").Child("id").value().int64_value()<< std::endl;
//     std::cerr << station.Child("station").Child("name").value().string_value()<< std::endl;

//     // Assign a value to the variable myRequest
//     myStation.description = station.Child("station").Child("description").value().string_value();
//     myStation.id = station.Child("station").Child("id").value().int64_value();
//     myStation.nameStation = station.Child("station").Child("name").value().string_value();
//     return myStation; 
// }

// std::vector<getRequestData> getMultiStation(){
//     std::vector<getRequestData> stations;
//        // Ensure that the Firebase app is initialized.
//     if (!firebase_app)
//     {
//         std::cerr << "Firebase app is not initialized." << std::endl;
//         // Handle error as needed.
//         return stations;
//     }

//     // Get a reference to the Firebase Realtime Database.
//     firebase::database::Database *database = firebase::database::Database::GetInstance(firebase_app);
//     if (!database)
//     {
//         std::cerr << "Failed to get the database instance." << std::endl;
//         // Handle error as needed.
//         return stations;
//     }
//          // Get the root reference location of the database.
//     firebase::database::DatabaseReference dbref = database->GetReference(requestPath);
//     firebase::Future<firebase::database::DataSnapshot> result = dbref.GetValue();
//     WaitForCompletion(result, "get");
//     const firebase::database::DataSnapshot myMultiStation = *result.result();
//     //check field of id whether exist or not 
//     if(!(myMultiStation .HasChild("multipleStation"))){
//         std::cerr << "Don't have this multipleStation's field" << std::endl;
//     }
//     // check value of id whether null or not
//     if(!(myMultiStation.Child("multipleStation").value().is_null())){
//         std::cerr << "multipleStation is not null" << std::endl;
//     }
//     std::string stationString = myMultiStation.Child("multipleStation").value().string_value();
//     parseMultiStation(stationString, stations);
//     return stations;
// }

// void parseMultiStation(std::string str, std::vector<getRequestData> &reqs){
//   // Tokenize the string by semicolon
//     std::istringstream iss(str);
//     std::string token;
//     std::vector<std::string> tokens;
//     while (std::getline(iss, token, ';')) {
//         tokens.push_back(token);
//     }
//         // Parse the number
//       numberOfStation = std::stoi(tokens[0]);
//       for (size_t i = 1; i < tokens.size(); ++i) {
//         std::istringstream zone_stream(tokens[i]);
//         std::string zone_name;
//         std::getline(zone_stream, zone_name, ':');

//         getRequestData my_req;
//         my_req.station.nameStation = zone_name;
//         zone_stream >> my_req.xPosition;
//         zone_stream.ignore(); // Ignore the delimiter ':'
//         zone_stream >> my_req.yPosition;
//         zone_stream.ignore(); // Ignore the delimiter ':'
//         std::string value3_str;
//         std::getline(zone_stream, value3_str, ';');
//         my_req.yaw = std::stoi(value3_str);
//         my_req.id = 3;
//         reqs.push_back(my_req);
//     }
// }