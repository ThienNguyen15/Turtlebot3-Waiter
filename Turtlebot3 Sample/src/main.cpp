#include "rclcpp/rclcpp.hpp"
#include "rclcpp/executor.hpp"
#include "geometry_msgs/msg/pose_with_covariance_stamped.hpp"
#include <iostream>
#include "update_handler.hpp"
#include "request_handler.hpp"
#include "path_planning_client.hpp"
#include "global.hpp"
#include <string>

int main(int argc, char *argv[])
{
    rclcpp::init(argc, argv);
    const char* dev = "hw:2,0";
    Speaker speaker(dev, 15);
    speaker.speak("Starting programs");
    auto node_amcl_pose = std::make_shared<AmclPoseSubscriber>();
    auto node_battery = std::make_shared<BatterySubscriber>();
    auto node_pub = std::make_shared<RequestHandler>();
    rclcpp::executors::MultiThreadedExecutor executor;
    executor.add_node(node_amcl_pose);
    executor.add_node(node_battery);
    executor.add_node(node_pub);
    executor.spin();
    speaker.speak("Program has shut down");
    return 0;
}