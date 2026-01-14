#include "request_handler.hpp"

RequestHandler::RequestHandler() : Node("request_handler"), ValueListener(), speaker("hw:2,0", 15)
{
    InitializeFirebase();
    database = firebase::database::Database::GetInstance(firebase_app);
    dbref = database->GetReference(requestPath);
    dbref.AddValueListener(this);
    timer = this->create_wall_timer(50ms, std::bind(&RequestHandler::handlerCallback, this));
    setStatus(true);
    isReachStation(0);
    setPosition(0, 0, 0);
    needPublishing = true;
    speaker.speak("Waiting for request");
}

RequestHandler::~RequestHandler()
{
    delete database;
}

void RequestHandler::OnValueChanged(
    const firebase::database::DataSnapshot &snapshot)
{
    int tmp_id = snapshot.Child("id").value().int64_value();
    RCLCPP_INFO(get_logger(), "Got request with ID %d", tmp_id);
    Request request;
    request.numStation = snapshot.Child("numStation").value().int64_value();
    request.station.clear();
    for (int i = 0; i < request.numStation; i++)
    {
        Station station;
        char str[10];
        sprintf(str, "station%d", i);
        firebase::Variant x = snapshot.Child(str).Child("x").value();
        firebase::Variant y = snapshot.Child(str).Child("y").value();
        firebase::Variant yaw = snapshot.Child(str).Child("yaw").value();
        station.x = (x.is_int64()) ? x.int64_value() : x.double_value();
        station.y = (y.is_int64()) ? y.int64_value() : y.double_value();
        station.yaw = (yaw.is_int64()) ? yaw.int64_value() : yaw.double_value();
        station.description = snapshot.Child(str).Child("description").value().string_value();
        station.id = snapshot.Child(str).Child("id").value().int64_value();
        station.name = snapshot.Child(str).Child("name").value().string_value();
        request.station.push_back(station);
        RCLCPP_INFO(get_logger(), "Got %s station: %f - %f - %f", request.station[i].name.c_str(), request.station[i].x, request.station[i].y, request.station[i].yaw);
    }
    request.id = tmp_id;
    request_list.push(request);
}

void RequestHandler::OnCancelled(const firebase::database::Error &error_code,
                                 const char *error_message)
{
}

void RequestHandler::postHttpReachGoal()
{
    CURL *curl;
    CURLcode res;

    /* In windows, this will init the winsock stuff */
    curl_global_init(CURL_GLOBAL_ALL);

    /* get a curl handle */
    curl = curl_easy_init();
    if (curl)
    {
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
        curl_easy_setopt(curl, CURLOPT_URL, "https://ultimatetech.live/v1/tours/mockup");
        /* Now specify the POST data */
        const char *json = "{\"fromStation\": \"1\", \"toStation\": \"10\"}";
        struct curl_slist *slist1 = NULL;
        slist1 = curl_slist_append(slist1, "Content-Type: application/json");
        slist1 = curl_slist_append(slist1, "Accept: application/json");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, slist1);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, json);

        /* Perform the request, res will get the return code */
        res = curl_easy_perform(curl);
        /* Check for errors */
        if (res != CURLE_OK)
            fprintf(stderr, "curl_easy_perform() failed: %s\n",
                    curl_easy_strerror(res));

        /* always cleanup */
        curl_easy_cleanup(curl);
    }
    curl_global_cleanup();
}

geometry_msgs::msg::PoseStamped RequestHandler::convert2GeometryMsg(double x, double y, double yaw)
{
    auto goal_pose = geometry_msgs::msg::PoseStamped();
    goal_pose.header.frame_id = "map";
    goal_pose.header.stamp = now();
    goal_pose.pose.position.x = x;
    goal_pose.pose.position.y = y;
    goal_pose.pose.position.z = 0.0;
    double radians = yaw * M_PI / 180.0;
    tf2::Quaternion quaternion;
    quaternion.setRPY(0, 0, radians);
    goal_pose.pose.orientation = tf2::toMsg(quaternion);
    return goal_pose;
}

void RequestHandler::handlerCallback()
{
    static char text[1024];
    static std::vector<std::shared_ptr<geometry_msgs::msg::PoseStamped>> allposes;
    static std::vector<int> optimized_idx;
    static auto start_timer = std::chrono::steady_clock::now();
    static bool flag_auto_back = true;
    static Request request;

    if (!request_list.empty()) {
        request = request_list.front();
        request_list.pop();
    }

    switch (state)
    {
    case 0:
        if (request.id == 1)
        {
            sprintf(text, "Start navigating to %s station", request.station[0].name.c_str());
            speaker.speak((const char *)text);
            allposes.clear();
            allposes.push_back(std::make_shared<geometry_msgs::msg::PoseStamped>(convert2GeometryMsg(request.station[0].x, request.station[0].y, request.station[0].yaw)));
            this->nav.startNavigation(convert2GeometryMsg(request.station[0].x, request.station[0].y, request.station[0].yaw));
            state = 1;
            setStatus(false);
            isReachStation(0);
            RCLCPP_INFO(get_logger(), "Start navigating to pick up station!\n");
        }
        if (flag_auto_back && std::chrono::steady_clock::now() - start_timer > std::chrono::seconds(10))
        {
            this->nav.startNavigation(convert2GeometryMsg(0, 0, 0));
            flag_auto_back = false;
        }
        break;
    case 1:
        if (this->nav.doneNavigate())
        {
            state = 2;
            sprintf(text, "Reached %s station, please confirm on your mobile app to start navigating", request.station[0].name.c_str());
            isReachStation(1);
            speaker.speak((const char *)text);
            RCLCPP_INFO(get_logger(), "Reached pick up station!\n");
        }

        if (request.id == 0)
        {
            this->nav.cancelNavigation();
            state = 0;
            setStatus(true);
            flag_auto_back = true;
            speaker.speak("Cancelled");
            isReachStation(0);
            start_timer = std::chrono::steady_clock::now();
            RCLCPP_INFO(get_logger(), "Cancel!\n");
        }
        break;
    case 2:
        if (request.id == 2)
        {
            if (request.numStation == 1)
            {
                sprintf(text, "Start navigating to %s desination", request.station[0].name.c_str());
                speaker.speak((const char *)text);
                this->nav.startNavigation(convert2GeometryMsg(request.station[0].x, request.station[0].y, request.station[0].yaw));
                state = 3;
                isReachStation(1);
                RCLCPP_INFO(get_logger(), "Start navigating to destination!\n");
            }
            else if (request.numStation > 1)
            {
                state = 4;
                RCLCPP_INFO(get_logger(), "Start navigating to multiple destination!\n");
            }
        }
        if (request.id == 0)
        {
            state = 0;
            setStatus(true);
            flag_auto_back = true;
            speaker.speak("Cancelled");
            isReachStation(0);
            start_timer = std::chrono::steady_clock::now();
            RCLCPP_INFO(get_logger(), "Cancel!\n");
        }
        break;
    case 3:
        if (this->nav.doneNavigate())
        {
            state = 0;
            setStatus(true);
            flag_auto_back = true;
            sprintf(text, "Reached %s desination", request.station[0].name.c_str());
            speaker.speak((const char *)text);
            sprintf(text, "%s", request.station[0].description.c_str());
            speaker.speak((const char *)text);
            isReachStation(2);
            rclcpp::sleep_for(std::chrono::seconds(3));
            isReachStation(0);
            start_timer = std::chrono::steady_clock::now();
            RCLCPP_INFO(get_logger(), "Reached destination!\n");
        }

        if (request.id == 0)
        {
            this->nav.cancelNavigation();
            state = 0;
            setStatus(true);
            flag_auto_back = true;
            speaker.speak("Cancelled");
            isReachStation(0);
            start_timer = std::chrono::steady_clock::now();
            RCLCPP_INFO(get_logger(), "Cancel!\n");
        }
        break;
    case 4:
        for (int i = 0; i < request.station.size(); i++)
        {
            allposes.push_back(std::make_shared<geometry_msgs::msg::PoseStamped>(convert2GeometryMsg(request.station[i].x, request.station[i].y, request.station[i].yaw)));
        }
        optimized_idx = path_cli.getOptimizedPath(allposes);

        for (int i = 0; i < request.numStation + 2; i++)
        {
            if (i != 0 && i != request.numStation+1)
            {
                sprintf(text, "Start navigating to %s station", request.station[optimized_idx[i]-1].name.c_str());
                speaker.speak((const char *)text);
            }

            RCLCPP_INFO(get_logger(), "Navigating to multiple stations!\n");
            this->nav.startNavigation(*allposes[optimized_idx[i]]);
            rclcpp::sleep_for(std::chrono::seconds(2));
            while (!nav.doneNavigate())
            {
                if (request.id == 0)
                {
                    this->nav.cancelNavigation();
                    state = 0;
                    setStatus(true);
                    flag_auto_back = true;
                    speaker.speak("Cancelled");
                    isReachStation(0);
                    start_timer = std::chrono::steady_clock::now();
                    RCLCPP_INFO(get_logger(), "Cancel!\n");
                    return;
                }
            }
            if (i != 0 && i != request.numStation+1)
            {
                sprintf(text, "%s", request.station[optimized_idx[i]-1].description.c_str());
                speaker.speak((const char *)text);
                rclcpp::sleep_for(std::chrono::seconds(5));
            }
        }
        allposes.clear();
        optimized_idx.clear();
        state = 0;
        setStatus(true);
        flag_auto_back = true;
        start_timer = std::chrono::steady_clock::now();
        sprintf(text, "This is the end of tour");
        speaker.speak((const char *)text);
        isReachStation(2);
        rclcpp::sleep_for(std::chrono::seconds(3));
        isReachStation(0);
        RCLCPP_INFO(get_logger(), "End of tour!\n");
        break;
    default:
        break;
    }
}
