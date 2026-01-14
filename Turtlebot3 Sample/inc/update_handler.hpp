#ifndef PUBLISHER
#define PUBLISHER

#include "rclcpp/rclcpp.hpp"
#include "sensor_msgs/msg/battery_state.hpp"
#include "geometry_msgs/msg/pose_with_covariance_stamped.hpp"
#include "tf2_geometry_msgs/tf2_geometry_msgs.h"
#include "tf2/LinearMath/Quaternion.h"
#include "navigation_client.hpp"
#include "global.hpp"
#include "turtlebot3_firebase.hpp"

class AmclPoseSubscriber : public rclcpp::Node
{
public:
    AmclPoseSubscriber();

private:
    void processAmclPose(const geometry_msgs::msg::PoseWithCovarianceStamped::SharedPtr msg);

    rclcpp::Subscription<geometry_msgs::msg::PoseWithCovarianceStamped>::SharedPtr subscription_;
    double x;
    double y;
    double yaw_degree;
};

class BatterySubscriber : public rclcpp::Node
{
public:
    BatterySubscriber();

private:
    void processBattery(sensor_msgs::msg::BatteryState::SharedPtr msg);
    void timerCallback();

    rclcpp::Subscription<sensor_msgs::msg::BatteryState>::SharedPtr subscription_;
    rclcpp::TimerBase::SharedPtr timer_;
    int battery;
};

#endif