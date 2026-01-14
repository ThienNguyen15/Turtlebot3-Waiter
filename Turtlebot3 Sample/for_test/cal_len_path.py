import rclpy
from rclpy.node import Node
from nav_msgs.msg import Odometry
from action_msgs.msg import GoalStatusArray
from geometry_msgs.msg import PoseStamped
import numpy as np

class NavigationMonitor(Node):
    def __init__(self):
        super().__init__('navigation_monitor')
        self.odom_sub = self.create_subscription(
            Odometry,
            '/odom',
            self.odom_callback,
            10)
        self.status_sub = self.create_subscription(
            GoalStatusArray,
            'navigate_to_pose/_action/status',
            self.status_callback,
            10)
        self.pose_list = []
        self.is_navigating = False

    def odom_callback(self, msg):
        if self.is_navigating:
            # Append odometry data to the list
            self.pose_list.append(msg.pose.pose)

    def status_callback(self, msg):
        # Check if the navigation action status is 2 (Active) or 4 (Succeeded)
        for status in msg.status_list:
            if status.status == 2:
                self.is_navigating = True
                self.pose_list.clear()
            elif status.status == 4:
                self.is_navigating = False
                self.calculate_distance()

    def calculate_distance(self):
        if len(self.pose_list) > 1:
            # Calculate distance traveled using pose information
            total_distance = 0.0
            prev_pose = None
            for pose in self.pose_list:
                if prev_pose is not None:
                    delta_x = pose.position.x - prev_pose.position.x
                    delta_y = pose.position.y - prev_pose.position.y
                    distance = np.sqrt(delta_x**2 + delta_y**2)
                    total_distance += distance
                prev_pose = pose
            print("Total distance traveled: ", total_distance)
        else:
            print("Not enough poses to calculate distance")

def main(args=None):
    rclpy.init(args=args)
    navigation_monitor = NavigationMonitor()
    rclpy.spin(navigation_monitor)
    rclpy.shutdown()

if __name__ == '__main__':
    main()