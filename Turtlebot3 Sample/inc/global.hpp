#ifndef GLOBAL
#define GLOBAL

#include "turtlebot3_firebase.hpp"
#include <queue>

extern bool needPublishing;
extern bool stopNavigating;
extern int state;
extern std::queue<Request> request_list;
#endif