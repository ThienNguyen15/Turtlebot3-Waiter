#include "path_planning_client.hpp"

TspSolving::TspSolving()
{
    minCost = INT_MAX;
}

double TspSolving::dp(int i, int mask)
{
    if (mask == (1 << size) - 1)
    {                      // All vertices have been visited
        return dist[i][0]; // Return to vertex 1
    }
    if (memo[i][mask] != 0)
    {
        return memo[i][mask];
    }

    double res = INT_MAX;

    for (int j = 0; j < size; ++j)
    {
        if (!(mask & (1 << j)))
        {
            res = (double) std::min(res, dp(j, mask | (1 << j)) + dist[i][j]);
        }
    }

    return memo[i][mask] = res;
}

void TspSolving::savePath(int i, int mask)
{
    if (mask == (1 << size) - 1)
    {
        shortestPath.push_back(0); // Starting vertex
        return;
    }

    for (int j = 0; j < size; ++j)
    {
        if (!(mask & (1 << j)))
        {
            double nextCost = (double) dp(j, mask | (1 << j)) + dist[i][j];
            if (dp(i, mask) == nextCost)
            {
                shortestPath.push_back(j);    // Add vertex j to the path
                savePath(j, mask | (1 << j)); // Recursive call with vertex j
                return;
            }
        }
    }
}

std::vector<int> TspSolving::dynamicProgramming(std::vector<std::vector<double>> graph, int s)
{
    dist = graph;
    size = graph.size();

    memo = new double *[size];
    for (int i = 0; i < size; i++)
    {
        memo[i] = new double[1 << size];
    }

    savePath(s, 1);

    for (int i = 0; i < size; i++)
    {
        delete[] memo[i];
    }
    delete[] memo;

    shortestPath.insert(shortestPath.begin(), s);

    return shortestPath;
}

std::vector<int> PathPlanningClient::bruteForce(std::vector<std::vector<double>> graph, int s)
{
    std::vector<int> vertex;
    for (int i = 0; i < graph.size(); i++)
    {
        if (i != s)
            vertex.push_back(i);
    }

    std::vector<int> min_path_vertices;
    double min_path_weight = std::numeric_limits<double>::max();
    do
    {
        double current_path_weight = 0;
        int k = s;
        std::vector<int> current_path_vertices;
        current_path_vertices.push_back(s);
        for (int i = 0; i < vertex.size(); i++)
        {
            current_path_weight += graph[k][vertex[i]];
            k = vertex[i];
            current_path_vertices.push_back(k);
        }
        current_path_weight += graph[k][s];
        current_path_vertices.push_back(s);

        if (current_path_weight < min_path_weight)
        {
            min_path_weight = current_path_weight;
            min_path_vertices = current_path_vertices;
        }

    } while (std::next_permutation(vertex.begin(), vertex.end()));

    std::cout << "Minimum Path Weight: " << min_path_weight << std::endl;
    return min_path_vertices;
}

PathPlanningClient::PathPlanningClient() : Node("path_planning_client")
{
    compute_path_to_pose_client_ = rclcpp_action::create_client<nav2_msgs::action::ComputePathToPose>(
        this, "compute_path_to_pose");
    smooth_path_client_ = rclcpp_action::create_client<nav2_msgs::action::SmoothPath>(
        this, "smooth_path");
    follow_path_client_ = rclcpp_action::create_client<nav2_msgs::action::FollowPath>(
        this, "follow_path");
    tf_broadcaster_ = std::make_shared<tf2_ros::TransformBroadcaster>(this);

    // auto pose1 = std::make_shared<geometry_msgs::msg::PoseStamped>();
    // pose1->header.frame_id = "map";
    // pose1->header.stamp = now();
    // pose1->pose.position.x = 0.97;
    // pose1->pose.position.y = -0.53;
    // pose1->pose.position.z = 0.0;
    // pose1->pose.orientation.w = 1.0;
    // pose1->pose.orientation.x = 0.0;
    // pose1->pose.orientation.y = 0.0;
    // pose1->pose.orientation.z = 0.0;

    // auto pose2 = std::make_shared<geometry_msgs::msg::PoseStamped>();
    // pose2->header.frame_id = "map";
    // pose2->header.stamp = now();
    // pose2->pose.position.x = 0.0;
    // pose2->pose.position.y = 0.0;
    // pose2->pose.position.z = 0.0;
    // pose2->pose.orientation.w = 1.0;
    // pose2->pose.orientation.x = 0.0;
    // pose2->pose.orientation.y = 0.0;
    // pose2->pose.orientation.z = 0.0;

    // auto pose3 = std::make_shared<geometry_msgs::msg::PoseStamped>();
    // pose3->header.frame_id = "map";
    // pose3->header.stamp = now();
    // pose3->pose.position.x = 1.67;
    // pose3->pose.position.y = 0.47;
    // pose3->pose.position.z = 0.0;
    // pose3->pose.orientation.w = 1.0;
    // pose3->pose.orientation.x = 0.0;
    // pose3->pose.orientation.y = 0.0;
    // pose3->pose.orientation.z = 0.0;

    // auto pose4 = std::make_shared<geometry_msgs::msg::PoseStamped>();
    // pose4->header.frame_id = "map";
    // pose4->header.stamp = now();
    // pose4->pose.position.x = 1.76;
    // pose4->pose.position.y = -0.81;
    // pose4->pose.position.z = 0.0;
    // pose4->pose.orientation.w = 1.0;
    // pose4->pose.orientation.x = 0.0;
    // pose4->pose.orientation.y = 0.0;
    // pose4->pose.orientation.z = 0.0;

    // std::vector<std::shared_ptr<geometry_msgs::msg::PoseStamped>> allposes = {pose1, pose2, pose3, pose4};

    // getOptimizedPath(allposes)
}

std::vector<int> PathPlanningClient::getOptimizedPath(const std::vector<std::shared_ptr<geometry_msgs::msg::PoseStamped>> &poses)
{
    std::vector<std::vector<double>> distances(poses.size(), std::vector<double>(poses.size()));
    std::vector<std::vector<nav_msgs::msg::Path::SharedPtr>> paths(poses.size(), std::vector<nav_msgs::msg::Path::SharedPtr>(poses.size()));
    std::vector<int> optimized_path;

    for (size_t i = 0; i < poses.size(); ++i)
    {
        for (size_t j = i + 1; j < poses.size(); ++j)
        {
            // Call getPath with the current pair of poses
            paths[i][j] = getPath(poses[i], poses[j]);
            paths[j][i] = getPath(poses[j], poses[i]);
            if (paths[i][j] == nullptr || paths[j][i] == nullptr)
            {
                RCLCPP_ERROR(get_logger(), "Invalid path.");
                return optimized_path;
            }
            paths[i][j] = smoothPath(paths[i][j]);
            paths[j][i] = smoothPath(paths[j][i]);
            distances[i][j] = processPath(paths[i][j]);
            distances[j][i] = distances[i][j];
            std::cout << "Path from pose " << poses[i]->pose.position.x << "," << poses[i]->pose.position.y << " to pose " << poses[j]->pose.position.x << "," << poses[j]->pose.position.y << ": " << processPath(paths[i][j]) << std::endl;
        }
    }
    for (size_t i = 0; i < poses.size(); ++i)
    {
        for (size_t j = 0; j < poses.size(); ++j)
        {
            std::cout << distances[i][j] << " ";
        }
        std::cout << std::endl;
    }

    optimized_path = bruteForce(distances, 0);
    // std::vector<int> optimized_path = tsp_solving.dynamicProgramming(distances, 0);

    std::cout << "Minimum Path: ";
    for (int vertex : optimized_path)
        std::cout << vertex << " ";
    std::cout << std::endl;

    return optimized_path;

    // int prev = optimized_path[0], cur = optimized_path[1];
    // for (int i=1; i < optimized_path.size(); i++)
    // {
    //     cur = optimized_path[i];
    //     while (!nav.doneNavigate());
    //     // std::cout << "navigating to: " << poses[i]->pose.position.x << " " << poses[i]->pose.position.y << std::endl;
    //     std::cout << prev << "-->" << cur << std::endl;
    //     followPath(paths[prev][cur]);
    //     prev = optimized_path[i];
    //     // nav.startNavigation(*poses[vertex]);
    // }
}

double PathPlanningClient::processPath(const nav_msgs::msg::Path::SharedPtr path)
{
    auto prev_pose = std::make_shared<geometry_msgs::msg::PoseStamped>();
    float path_length = 0;
    for (const auto &pose : path->poses)
    {
        if (prev_pose != nullptr)
        {
            float dx = pose.pose.position.x - prev_pose->pose.position.x;
            float dy = pose.pose.position.y - prev_pose->pose.position.y;
            float segment_length = std::sqrt(dx * dx + dy * dy);
            path_length += segment_length;
        }
        prev_pose = std::make_shared<geometry_msgs::msg::PoseStamped>(pose);
    }
    return path_length;
}

rclcpp_action::Client<nav2_msgs::action::ComputePathToPose>::SharedPtr compute_path_to_pose_client_;
std::shared_ptr<tf2_ros::TransformBroadcaster> tf_broadcaster_;

std::shared_ptr<nav_msgs::msg::Path> PathPlanningClient::getPath(const std::shared_ptr<geometry_msgs::msg::PoseStamped> &start,
                                                                 const std::shared_ptr<geometry_msgs::msg::PoseStamped> &goal)
{
    while (!compute_path_to_pose_client_->wait_for_action_server(1s))
    {
        RCLCPP_INFO(get_logger(), "Waiting for 'ComputePathToPose' action server...");
    }

    auto goal_msg = nav2_msgs::action::ComputePathToPose::Goal();
    goal_msg.start = *start;
    goal_msg.goal = *goal;
    goal_msg.use_start = true;

    RCLCPP_INFO(get_logger(), "Getting path...");
    auto send_goal_future = compute_path_to_pose_client_->async_send_goal(goal_msg);
    if (rclcpp::spin_until_future_complete(this->get_node_base_interface(), send_goal_future) !=
        rclcpp::FutureReturnCode::SUCCESS)
    {
        RCLCPP_ERROR(get_logger(), "Failed to get path.");
        return nullptr;
    }

    auto goal_handle = send_goal_future.get();
    if (!goal_handle)
    {
        RCLCPP_ERROR(get_logger(), "Goal was rejected.");
        return nullptr;
    }

    auto result_future = compute_path_to_pose_client_->async_get_result(goal_handle);
    if (rclcpp::spin_until_future_complete(this->get_node_base_interface(), result_future) !=
        rclcpp::FutureReturnCode::SUCCESS)
    {
        RCLCPP_ERROR(get_logger(), "Failed to get result.");
        return nullptr;
    }

    auto result = result_future.get();
    if (result.code != rclcpp_action::ResultCode::SUCCEEDED)
    {
        RCLCPP_ERROR(get_logger(), "Getting path failed with status code: %d", result.code);
        return nullptr;
    }

    return std::make_shared<nav_msgs::msg::Path>(result.result->path);
}

std::shared_ptr<nav_msgs::msg::Path> PathPlanningClient::smoothPath(const nav_msgs::msg::Path::SharedPtr path, std::string smoother_id,
                                                                    double max_duration, bool check_for_collision)
{
    RCLCPP_INFO(this->get_logger(), "Waiting for 'SmoothPath' action server");
    while (!smooth_path_client_->wait_for_action_server(std::chrono::seconds(1)))
    {
        RCLCPP_INFO(this->get_logger(), "'SmoothPath' action server not available, waiting...");
    }

    auto goal_msg = nav2_msgs::action::SmoothPath::Goal();
    goal_msg.path = *path;
    goal_msg.smoother_id = smoother_id;
    goal_msg.max_smoothing_duration = rclcpp::Duration::from_seconds(max_duration);
    goal_msg.check_for_collisions = check_for_collision;

    if (!smoother_id.empty())
    {
        goal_msg.smoother_id = smoother_id;
    }

    goal_msg.check_for_collisions = check_for_collision;

    RCLCPP_INFO(this->get_logger(), "Smoothing path...");
    auto send_goal_options = rclcpp_action::Client<nav2_msgs::action::SmoothPath>::SendGoalOptions();
    auto future_goal_handle = smooth_path_client_->async_send_goal(goal_msg, send_goal_options);
    if (rclcpp::spin_until_future_complete(this->get_node_base_interface(), future_goal_handle) != rclcpp::FutureReturnCode::SUCCESS)
    {
        RCLCPP_ERROR(this->get_logger(), "Failed to send goal to SmoothPath action server");
        return nullptr;
    }

    auto goal_handle = future_goal_handle.get();
    if (!goal_handle)
    {
        RCLCPP_ERROR(this->get_logger(), "Goal was rejected by the SmoothPath action server");
        return nullptr;
    }

    auto result_future = smooth_path_client_->async_get_result(goal_handle);
    if (rclcpp::spin_until_future_complete(this->get_node_base_interface(), result_future) != rclcpp::FutureReturnCode::SUCCESS)
    {
        RCLCPP_ERROR(this->get_logger(), "Failed to receive result from SmoothPath action server");
        return nullptr;
    }

    auto result = result_future.get();
    if (result.code != rclcpp_action::ResultCode::SUCCEEDED)
    {
        RCLCPP_WARN(this->get_logger(), "Getting path failed.");
        return nullptr;
    }

    return std::make_shared<nav_msgs::msg::Path>(result.result->path);
}

bool PathPlanningClient::followPath(const nav_msgs::msg::Path::SharedPtr path,
                                    const std::string controller_id,
                                    const std::string goal_checker_id)
{
    auto goal_msg = nav2_msgs::action::FollowPath::Goal();
    goal_msg.path = *path;
    goal_msg.controller_id = controller_id;
    goal_msg.goal_checker_id = goal_checker_id;

    RCLCPP_INFO(get_logger(), "Executing path...");
    auto future_goal_handle = follow_path_client_->async_send_goal(goal_msg);

    if (rclcpp::spin_until_future_complete(this->get_node_base_interface(), future_goal_handle) != rclcpp::FutureReturnCode::SUCCESS)
    {
        RCLCPP_ERROR(this->get_logger(), "Failed to send goal to FollowPath action server");
        return false;
    }

    auto goal_handle_ = future_goal_handle.get();
    if (!goal_handle_)
    {
        RCLCPP_ERROR(get_logger(), "Follow path was rejected!");
        return false;
    }
    auto result_future = follow_path_client_->async_get_result(goal_handle_);
    return true;
}