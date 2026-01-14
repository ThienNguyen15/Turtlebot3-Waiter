#ifndef REQUEST_HANDLING
#define REQUEST_HANDLING

#include "rclcpp/rclcpp.hpp"
#include "geometry_msgs/msg/pose_with_covariance_stamped.hpp"
#include "tf2_geometry_msgs/tf2_geometry_msgs.h"
#include "tf2/LinearMath/Quaternion.h"
#include <iostream>
#include "global.hpp"
#include "nav2_msgs/action/navigate_to_pose.hpp"
#include "rclcpp_action/rclcpp_action.hpp"
#include "navigation_client.hpp"
#include "path_planning_client.hpp"
#include "turtlebot3_firebase.hpp"
#include "myspeaker.hpp"
#include "chrono"
#include "curl/curl.h"

class RequestHandler : public rclcpp::Node, public firebase::database::ValueListener
{
public:
    RequestHandler();
    ~RequestHandler();
private:
    void handlerCallback();
    void getInput();
    void OnValueChanged(const firebase::database::DataSnapshot &snapshot) override;
    void OnCancelled(const firebase::database::Error &error_code, const char *error_message) override;
    void postHttpReachGoal();
    geometry_msgs::msg::PoseStamped convert2GeometryMsg(double x, double y, double yaw);
    firebase::database::DatabaseReference dbref;
    firebase::database::Database *database;
    NavigationClient nav;
    PathPlanningClient path_cli;
    rclcpp::Publisher<geometry_msgs::msg::PoseWithCovarianceStamped>::SharedPtr publisher_;
    rclcpp::TimerBase::SharedPtr timer;
    Speaker speaker;
};

#endif