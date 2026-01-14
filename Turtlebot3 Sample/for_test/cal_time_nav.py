import rclpy
from rclpy.node import Node
from action_msgs.msg import GoalStatusArray
import time
import psutil
from threading import Timer

class NavigationSubscriber(Node):

    def __init__(self):
        super().__init__('navigation_subscriber')
        self.subscription = self.create_subscription(
            GoalStatusArray,
            'navigate_to_pose/_action/status',
            self.listener_callback,
            10)
        self.subscription  # prevent unused variable warning
        self.timer_started = False
        self.start_time = None
        self.start_mem_info = None
        self.cpu_peak = 0.0
        self.cpu_check_interval = 0.1  # Check CPU utilization every 100ms
        self.cpu_timer = None

    def log_memory_usage(self, label):
        process = psutil.Process()
        mem_info = process.memory_info()
        self.get_logger().info(f'{label} - RSS: {mem_info.rss / 1024 ** 2:.2f} MB, VMS: {mem_info.vms / 1024 ** 2:.2f} MB')
        return mem_info

    def check_cpu_utilization(self):
        # Measure current CPU utilization
        current_cpu = psutil.cpu_percent(interval=None)
        if current_cpu > self.cpu_peak:
            self.cpu_peak = current_cpu
        # Schedule the next check
        if self.timer_started:
            self.cpu_timer = Timer(self.cpu_check_interval, self.check_cpu_utilization)
            self.cpu_timer.start()

    def listener_callback(self, msg):
        for goal_status in msg.status_list:
            if goal_status.status == 2:  # Start timer
                self.timer_started = True
                self.start_time = time.time()
                self.start_mem_info = self.log_memory_usage('Timer started')
                self.cpu_peak = 0.0  # Reset peak CPU utilization
                self.check_cpu_utilization()  # Start checking CPU utilization
                self.get_logger().info('Timer started.')
            elif goal_status.status == 4 and self.timer_started:  # Stop timer
                self.timer_started = False
                if self.cpu_timer:
                    self.cpu_timer.cancel()
                end_time = time.time()
                elapsed_time = end_time - self.start_time
                end_mem_info = self.log_memory_usage('Timer stopped')
                rss_diff = (end_mem_info.rss - self.start_mem_info.rss) / 1024 ** 2
                vms_diff = (end_mem_info.vms - self.start_mem_info.vms) / 1024 ** 2
                self.get_logger().info('Timer stopped. Elapsed time: {:.2f} seconds'.format(elapsed_time))
                self.get_logger().info(f'Memory usage increased - RSS: {rss_diff:.2f} MB, VMS: {vms_diff:.2f} MB')
                self.get_logger().info(f'Peak CPU utilization: {self.cpu_peak:.2f}%')

def main(args=None):
    rclpy.init(args=args)
    navigation_subscriber = NavigationSubscriber()
    rclpy.spin(navigation_subscriber)
    navigation_subscriber.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
