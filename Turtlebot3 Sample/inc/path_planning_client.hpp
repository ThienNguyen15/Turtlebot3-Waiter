#ifndef PLANNER
#define PLANNER

#include <cmath>
#include <iostream>
#include <limits.h>
#include "geometry_msgs/msg/pose_stamped.hpp"
#include "nav2_msgs/action/compute_path_to_pose.hpp"
#include "nav2_msgs/action/smooth_path.hpp"
#include "nav2_msgs/action/follow_path.hpp"
#include "nav_msgs/msg/path.hpp"
#include "rclcpp/rclcpp.hpp"
#include "rclcpp_action/rclcpp_action.hpp"
#include "tf2_ros/transform_broadcaster.h"
#include "navigation_client.hpp"
#include "global.hpp"
#include <algorithm>
#include <cmath>
#include <vector>
#include <time.h>

using namespace std::chrono_literals;

class TspSolving {
public:
    TspSolving();
    std::vector<int> dynamicProgramming(std::vector<std::vector<double>> graph, int s);

private:
    double dp(int i, int mask);
    void savePath(int i, int mask);

    std::vector<std::vector<double>> dist;
    int size;
    std::vector<int> shortestPath;
    double minCost;
    double **memo;
};

class PathPlanningClient : public rclcpp::Node
{
public:
    PathPlanningClient();
    std::vector<int> getOptimizedPath(const std::vector<std::shared_ptr<geometry_msgs::msg::PoseStamped>> &poses);
    double processPath(const nav_msgs::msg::Path::SharedPtr path);
    std::vector<int> bruteForce(std::vector<std::vector<double>> graph, int s);

private:
    rclcpp_action::Client<nav2_msgs::action::ComputePathToPose>::SharedPtr compute_path_to_pose_client_;
    rclcpp_action::Client<nav2_msgs::action::SmoothPath>::SharedPtr smooth_path_client_;
    rclcpp_action::Client<nav2_msgs::action::FollowPath>::SharedPtr follow_path_client_;

    std::shared_ptr<tf2_ros::TransformBroadcaster> tf_broadcaster_;
    std::shared_ptr<nav_msgs::msg::Path> getPath(const std::shared_ptr<geometry_msgs::msg::PoseStamped> &start,
                                                 const std::shared_ptr<geometry_msgs::msg::PoseStamped> &goal);
    std::shared_ptr<nav_msgs::msg::Path> smoothPath(const nav_msgs::msg::Path::SharedPtr path, std::string smoother_id = "",
                                                    double max_duration = 2.0, bool check_for_collision = false);
    bool followPath(const nav_msgs::msg::Path::SharedPtr path,
                    const std::string controller_id = "",
                    const std::string goal_checker_id = "");
    // NavigationClient nav;
    TspSolving tsp_solving;
};

#endif PLANNER