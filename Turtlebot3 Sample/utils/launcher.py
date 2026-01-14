import subprocess
import signal
import wiringpi as wp
import time
import threading
import yaml
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PoseWithCovarianceStamped
from tf_transformations import euler_from_quaternion

yaml_file_path = "/opt/ros/humble/share/turtlebot3_navigation2/param/burger.yaml"

with open(yaml_file_path, 'r') as file:
    data = yaml.safe_load(file)

class AmclPoseSubscriber(Node):
    def __init__(self):
        self.init_x = 0.001
        self.init_y = 0.001
        self.init_yaw = 0.001

        super().__init__('amcl_pose_subscriber')
        self.subscription = self.create_subscription(
            PoseWithCovarianceStamped,
            '/amcl_pose',
            self.amcl_pose_callback,
            10
        )

    def amcl_pose_callback(self, msg):
        self.init_x = msg.pose.pose.position.x
        self.init_y = msg.pose.pose.position.y

        euler = euler_from_quaternion(
            [msg.pose.pose.orientation.x,
            msg.pose.pose.orientation.y,
            msg.pose.pose.orientation.z,
            msg.pose.pose.orientation.w]
        )
        yaw = euler[2]

        self.init_yaw = yaw

rclpy.init()
amcl_pose_subscriber = AmclPoseSubscriber()

# Define GPIO pins for the buttons
BUTTON_PIN = [36, 39]

# Flag to track if long press has already been detected for each button
long_press_detected = [False, False]
button_is_pressed = [False, False]

# Initialize wiringpi
wp.wiringPiSetupGpio()

# Set button pins as inputs with pull-up resistors, 0 same as 36, 1 same as 39
wp.pinMode(BUTTON_PIN[0], wp.INPUT)
wp.pullUpDnControl(BUTTON_PIN[0], wp.PUD_UP)

wp.pinMode(BUTTON_PIN[1], wp.INPUT)
wp.pullUpDnControl(BUTTON_PIN[1], wp.PUD_UP)

# Function to handle short press
def short_press(button_num):
    print(f"Short press {button_num} detected")

# Function to handle long press
def long_press(button_num):
    print(f"Long press {button_num} detected")

def isButtonPressed(button_num):
    if(button_is_pressed[button_num]):
        button_is_pressed[button_num] = False
        return True    
    return False

def isButtonLongPressed(button_num):
    if(long_press_detected[button_num]):
        long_press_detected[button_num] = False
        return True    
    return False

def button_processing():
    while True:
        # Wait for button press
        while wp.digitalRead(BUTTON_PIN[0]) == wp.HIGH and wp.digitalRead(BUTTON_PIN[1]) == wp.HIGH:
            time.sleep(0.01)
            button_is_pressed[0] = False
            button_is_pressed[1] = False
            long_press_detected[0] = False  # Reset flag for button 1 when button is not pressed
            long_press_detected[1] = False  # Reset flag for button 2 when button is not pressed

        # Record start time
        start_time = time.time()

        # Wait for button release or long press
        while wp.digitalRead(BUTTON_PIN[0]) == wp.LOW or wp.digitalRead(BUTTON_PIN[1]) == wp.LOW:
            if wp.digitalRead(BUTTON_PIN[0]) == wp.LOW and not long_press_detected[0]:
                time.sleep(0.01)
                # Check if it's a long press for button 1
                while (time.time() - start_time < 1):
                    if (wp.digitalRead(BUTTON_PIN[0]) == wp.HIGH):
                        # short_press(1)
                        button_is_pressed[0] = True
                        break
                if (not button_is_pressed[0]):
                    # long_press(1)
                    long_press_detected[0] = True
                    while wp.digitalRead(BUTTON_PIN[0]) == wp.LOW:
                        None

            if wp.digitalRead(BUTTON_PIN[1]) == wp.LOW and not long_press_detected[1]:
                time.sleep(0.01)
                # Check if it's a long press for button 2
                while (time.time() - start_time < 1):
                    if (wp.digitalRead(BUTTON_PIN[1]) == wp.HIGH):
                        # short_press(2)
                        button_is_pressed[1] = True
                        break
                if (not button_is_pressed[1]):
                    # long_press(2)
                    long_press_detected[1] = True
                    while wp.digitalRead(BUTTON_PIN[1]) == wp.LOW:
                        None


def launch_subprocess():
    return subprocess.Popen(['ros2', 'launch', '/root/test_launch.py'])

def send_signal_to_process(process):
    process.send_signal(signal.SIGINT)
    
def launch_handler():
    process = None
    while True:
        None
        time.sleep(0.01)
        if isButtonPressed(0):
            if process is None or process.poll() is not None:
                process = launch_subprocess()
            else:
                print("Subprocess is already running.")
            time.sleep(1)
        elif isButtonPressed(1):
            data['amcl']['ros__parameters']['initial_pose']['x'] = amcl_pose_subscriber.init_x + 0.001
            data['amcl']['ros__parameters']['initial_pose']['y'] = amcl_pose_subscriber.init_y + 0.001

            data['amcl']['ros__parameters']['initial_pose']['yaw'] = amcl_pose_subscriber.init_yaw + 0.001

            print(data['amcl']['ros__parameters']['initial_pose']['x'],
                data['amcl']['ros__parameters']['initial_pose']['y'],
                data['amcl']['ros__parameters']['initial_pose']['yaw'])
            
            with open(yaml_file_path, 'w') as file:
                yaml.dump(data, file)

            time.sleep(2)
        elif isButtonLongPressed(1):
            if process is not None and process.poll() is None:
                send_signal_to_process(process)
            else:
                print("No running subprocess to send SIGINT to.")
            time.sleep(10)

def main():
    thread1 = threading.Thread(target=button_processing)
    thread1.start()
    thread2 = threading.Thread(target=launch_handler)
    thread2.start()
    rclpy.spin(amcl_pose_subscriber)
    amcl_pose_subscriber.destroy_node()
    rclpy.shutdown()
    thread1.join()
    thread2.join()

if __name__ == "__main__":
    main()

