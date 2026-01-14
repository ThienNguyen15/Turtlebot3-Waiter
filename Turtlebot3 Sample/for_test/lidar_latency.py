import rclpy
from rclpy.node import Node
from sensor_msgs.msg import LaserScan
from rclpy.time import Time

class LidarLatencyNode(Node):
    def __init__(self):
        super().__init__('lidar_latency_node')
        self.subscription = self.create_subscription(
            LaserScan,
            '/scan',
            self.listener_callback,
            10)
        self.subscription  # prevent unused variable warning

    def listener_callback(self, msg):
        # Get the current time when the message is received
        current_time = self.get_clock().now()
        
        # Extract the timestamp from the LiDAR message header
        lidar_time = Time.from_msg(msg.header.stamp)
        
        # Calculate the latency
        latency = (current_time - lidar_time).nanoseconds / 1e6  # convert to milliseconds
        
        if latency < 0:
            self.get_logger().warn(f'Negative latency detected: {latency:.2f} ms. Possible clock synchronization issue.')
        else:
            self.get_logger().info(f'Latency: {latency:.2f} ms')

def main(args=None):
    rclpy.init(args=args)
    node = LidarLatencyNode()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
