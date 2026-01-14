#!/usr/bin/env python3
from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
  ttb3_tourguide = Node(
      package='turtlebot3_tourguide',
      executable='turtlebot3_tourguide',
      name='turtlebot3_tourguide',
      output='screen',
  )

  ld = LaunchDescription()

  ld.add_action(ttb3_tourguide)

  return ld