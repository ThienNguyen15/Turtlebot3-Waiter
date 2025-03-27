const ROS_Config = {
    ROS_URL: "ws://localhost:9090",
    ROS_DOMAIN_ID: "30",
  
    CMD_VEL_TOPIC: "/cmd_vel",
    CMD_VEL_MSG: "geometry_msgs/Twist",
    MAP_TOPIC: "/map",
    MAP_MSG: "nav_msgs/OccupancyGrid",
    ODOM_TOPIC: "/odom",
    ODOM_MSG: "nav_msgs/Odometry",
    AMCL_POSE_TOPIC: "/amcl_pose",
    AMCL_POSE_MSG: "geometry_msgs/PoseWithCovarianceStamped",
    IMU_TOPIC: "imu",
    IMU_MSG: "sensor_msgs/Imu"
  };
  
  export default ROS_Config