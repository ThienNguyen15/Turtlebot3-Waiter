## Init submodule

```
git submodule init
git submodule update --remote
```

## How to build
### In CMakeLists.txt
- set(BUILD_FOR_X64 ON) if you are building on X64 machine
- set(BUILD_FOR_X64 OFF) if you are building on AARCH64 machine

### Build with CMake

```
mkdir build
cd build/
cmake ..
make -j4
```

### Build with colcon

```
cd <your ros workspace>
colcon build --packages-select turtlebot3_tourguide
```

# How to run

```
source install/local_setup.sh
ros2 run turtlebot3_tourguide turtlebot3_tourguide
```