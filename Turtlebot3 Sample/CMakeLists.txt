cmake_minimum_required(VERSION 3.9)
project(turtlebot3_tourguide)

set(BUILD_FOR_X64 OFF)

if (BUILD_FOR_X64)
  message(STATUS "building for x64")
  set(CMAKE_CXX_FLAGS "-D_GLIBCXX_USE_CXX11_ABI=0 -lpthread")
  add_subdirectory(${FIREBASE_CPP_SDK_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/firebase-cpp-sdk/)
  set(firebase_libs firebase_auth firebase_database firebase_app firebase_analytics)
else()
  message(STATUS "building for aarch64")
  link_directories(/usr/lib/firebase /usr/lib/firebase/deps/app /usr/lib/firebase/deps/database/external /usr/lib/aarch64-linux-gnu)
  set(firebase_libs 
      firebase_firestore
      firebase_storage
      firebase_functions
      firebase_database
      firebase_app
      firebase_rest_lib
      leveldb
      z
      flatbuffers
      libuWS
      secret-1
      glib-2.0
      ssl
      crypto
      curl)
endif()

include_directories(inc)

set(SRC_LIB src/turtlebot3_firebase.cpp)

add_library(turtlebot3_firebase ${SRC_LIB})
target_link_libraries(turtlebot3_firebase "${firebase_libs}")

#build turltebot3_tourguide

find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(geometry_msgs REQUIRED)
find_package(nav2_msgs REQUIRED)
find_package(nav2_lifecycle_manager REQUIRED)
find_package(tf2_geometry_msgs REQUIRED)
find_package(sensor_msgs REQUIRED)
find_package(nav2_util REQUIRED)
find_package(rclcpp_action REQUIRED)

set(CMAKE_CXX_FLAGS "-D_GLIBCXX_USE_CXX11_ABI=1")

set(SPEAKER_SRC
  ${CMAKE_CURRENT_SOURCE_DIR}/src/myspeaker.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/inc/myspeaker.hpp
)

if (BUILD_FOR_X64)
  add_library(speaker
    ${SPEAKER_SRC}
  )
  target_compile_definitions(speaker PUBLIC BUILD_FOR_X64=1)
else()
  unset(BUILD_FOR_X64)
  add_library(speaker
    ${SPEAKER_SRC}
  )
  target_compile_definitions(speaker PUBLIC asound)
endif()

set(SRC
  ${CMAKE_CURRENT_SOURCE_DIR}/src/path_planning_client.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/src/request_handler.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/src/update_handler.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/src/navigation_client.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/src/main.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/src/global.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/inc/path_planning_client.hpp
  ${CMAKE_CURRENT_SOURCE_DIR}/inc/myspeaker.hpp
  ${CMAKE_CURRENT_SOURCE_DIR}/inc/request_handler.hpp
  ${CMAKE_CURRENT_SOURCE_DIR}/inc/update_handler.hpp
  ${CMAKE_CURRENT_SOURCE_DIR}/inc/navigation_client.hpp
  ${CMAKE_CURRENT_SOURCE_DIR}/inc/global.hpp
)

add_executable(turtlebot3_tourguide
  ${SRC}
)
target_link_libraries(turtlebot3_tourguide "${firebase_libs}" ${CMAKE_BINARY_DIR}/libturtlebot3_firebase.a ${CMAKE_BINARY_DIR}/libspeaker.a asound)
add_dependencies(turtlebot3_tourguide turtlebot3_firebase)


ament_target_dependencies(turtlebot3_tourguide
  rclcpp
  rclcpp_action
  geometry_msgs
  nav2_msgs
  nav_msgs
  rclcpp_action  
  nav2_lifecycle_manager
  tf2_geometry_msgs
  sensor_msgs
  nav2_util
)

install(TARGETS
turtlebot3_tourguide
  DESTINATION lib/${PROJECT_NAME})

install(DIRECTORY launch
  DESTINATION share/${PROJECT_NAME}/
)

ament_package()