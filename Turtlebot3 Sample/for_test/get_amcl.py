# Save this script as `position_plotter.py` in the `my_position_plotter` package.

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PoseWithCovarianceStamped
import matplotlib.pyplot as plt
import time

class PositionPlotter(Node):
    def __init__(self):
        super().__init__('position_plotter')
        self.subscription = self.create_subscription(
            PoseWithCovarianceStamped,
            '/amcl_pose',
            self.pose_callback,
            10
        )
        self.sample_times = []
        self.x_positions = []
        self.y_positions = []
        self.init_time = -1

    def pose_callback(self, msg):
        if (self.init_time == -1):
            self.init_time = timestamp = msg.header.stamp.sec + msg.header.stamp.nanosec * 1e-9
        timestamp = msg.header.stamp.sec + msg.header.stamp.nanosec * 1e-9 - self.init_time
        x = msg.pose.pose.position.x
        y = msg.pose.pose.position.y

        self.sample_times.append(timestamp)
        self.x_positions.append(x)
        self.y_positions.append(y)

        self.plot_positions()

    def plot_positions(self):
        # plt.plot(self.sample_times, self.x_positions)
        # plt.title('Robot X Position over Time')
        # plt.xlabel('Sample Time (s)')
        # plt.ylabel('X Position (m)')
        # plt.ylim(min(self.x_positions), max(self.x_positions) )

        plt.plot(self.sample_times, self.y_positions)
        plt.title('Robot Y Position over Time')
        plt.xlabel('Sample Time (s)')
        plt.ylabel('Y Position (m)')
        plt.ylim(min(self.y_positions), max(self.y_positions) )

        plt.pause(0.1)

def main(args=None):
    rclpy.init(args=args)

    position_plotter = PositionPlotter()

    try:
        rclpy.spin(position_plotter)
    except KeyboardInterrupt:
        position_plotter.get_logger().info('Position plotter stopped by user.')
        position_plotter.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
