const DOOR_OPEN_TIME = 2500;
const DOOR_CLOSE_TIME = 2500;
const FLOOR_TRAVEL_TIME = 2000;
const LIFT_HORIZONTAL_SPACING = 120;
const LIFT_HEIGHT = 100;

// State management
const state = {
  numberOfFloors: 0,
  numberOfLifts: 0,
  lifts: [],
  floors: [],
  callQueue: [],
};

// Helper functions for state management
const updateState = (key, value) => {
  state[key] = value;
};

const initializeLifts = () => {
  state.lifts = Array.from({ length: state.numberOfLifts }, (_, index) => ({
    id: index,
    active: false,
    currentFloor: 0,
    direction: null,
  }));
};

const initializeFloors = () => {
  state.floors = Array.from({ length: state.numberOfFloors }, () => ({
    upActive: false,
    downActive: false,
  }));
};

const addToCallQueue = (floorNumber, direction) => {
  if (
    !state.callQueue.some(
      (call) => call.floor === floorNumber && call.direction === direction
    )
  ) {
    state.callQueue.push({ floor: floorNumber, direction });
  }
};

const processCallQueue = () => {
  if (state.callQueue.length > 0) {
    const nextCall = state.callQueue[0];
    const availableLift = getNearestAvailableLift(
      nextCall.floor,
      nextCall.direction
    );
    if (availableLift !== null) {
      state.callQueue.shift();
      moveLift(nextCall.floor, nextCall.direction, availableLift);
    }
  }
};

// form handler
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("input-form");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const floorsInput = document.getElementById("floor-input");
    const liftsInput = document.getElementById("lift-input");

    try {
      const floors = parseInt(floorsInput.value);
      const lifts = parseInt(liftsInput.value);

      if (isNaN(floors) || isNaN(lifts)) {
        throw new Error("Please enter valid numbers for floors and lifts");
      }

      if (floors === 1 && lifts > 1) {
        throw new Error("A single-floor building can only have one lift.");
      }

      if (floors < 1 || lifts < 1) {
        throw new Error("Please enter positive numbers");
      }

      updateState("numberOfFloors", floors);
      updateState("numberOfLifts", lifts);

      initializeLifts();
      initializeFloors();

      console.log("Number of floors:", state.numberOfFloors);
      console.log("Number of lifts:", state.numberOfLifts);

      const inputSection = document.getElementById("input-section");
      const liftSimulatorSection = document.getElementById("lift-simulator");

      liftSimulatorSection.classList.remove("hidden");
      renderInteractive();
      setupResizeHandler();
      inputSection.classList.remove("section_container");
      inputSection.classList.add("hidden");
    } catch (error) {
      alert(error.message);
    }
  });
});

const updateSimulatorWidth = () => {
  const liftSimulatorSection = document.getElementById("lift-simulator");
  const minWidth = (state.numberOfLifts + 1) * LIFT_HORIZONTAL_SPACING;
  const maxWidth = Math.max(minWidth, window.innerWidth);
  liftSimulatorSection.style.width = `${maxWidth}px`;
  liftSimulatorSection.style.overflowX =
    minWidth > window.innerWidth ? "auto" : "hidden";
};

const setupResizeHandler = () => {
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      updateSimulatorWidth();
    }, 250);
  });
};

const renderInteractive = () => {
  const liftSimulatorSection = document.getElementById("lift-simulator");
  liftSimulatorSection.innerHTML = "";
  updateSimulatorWidth();
  renderFloors(liftSimulatorSection);
  renderLifts();
};

// render floors function
const renderFloors = (container) => {
  for (let i = state.numberOfFloors; i > 0; i--) {
    const floorDiv = document.createElement("div");
    floorDiv.className = "floor";
    floorDiv.id = `floor${i}`;

    const buttonList = document.createElement("div");
    buttonList.className = "button-list";
    floorDiv.appendChild(buttonList);

    if (i !== state.numberOfFloors || state.numberOfLifts === 1) {
      const upButton = createAccessibleButton("Up", i - 1, "up");
      buttonList.appendChild(upButton);
    }

    if (i !== 1) {
      const downButton = createAccessibleButton("Down", i - 1, "down");
      buttonList.appendChild(downButton);
    }

    const infoDiv = document.createElement("div");
    infoDiv.textContent = `Floor ${i}`;
    infoDiv.className = "floor-info";
    floorDiv.appendChild(infoDiv);

    container.appendChild(floorDiv);
  }
};

// button click handler
const handleLiftCall = (floorNumber, direction) => {
  if (state.floors[floorNumber][`${direction}Active`]) {
    console.log(`${direction} button on floor ${floorNumber} already active`);
    return;
  }

  state.floors[floorNumber][`${direction}Active`] = true;

  const availableLift = getNearestAvailableLift(floorNumber);
  if (availableLift !== null) {
    moveLift(floorNumber, direction, availableLift);
  } else {
    addToCallQueue(floorNumber, direction);
    console.log(
      `All lifts busy. Floor ${floorNumber} ${direction} call added to queue.`
    );
  }
};

// create accessible button function
const createAccessibleButton = (text, floorNumber, direction) => {
  const button = document.createElement("button");
  button.textContent = text;
  button.setAttribute("aria-label", `Call lift ${text.toLowerCase()}`);
  button.onclick = () => handleLiftCall(floorNumber, direction);
  return button;
};

// render lifts function
const renderLifts = () => {
  // place all lifts on 1st floor initially.
  const firstFloorDiv = document.getElementById("floor1");

  state.lifts.forEach((_, index) => {
    const liftDiv = document.createElement("div");
    liftDiv.className = "lift";
    liftDiv.style.left = `${(index + 1) * LIFT_HORIZONTAL_SPACING}px`;
    liftDiv.id = `lift${index}`;
    liftDiv.setAttribute("aria-label", `Lift ${index + 1}`);

    const liftContainer = document.createElement("div");
    liftContainer.className = "lift-container";
    liftContainer.id = `lift-container${index}`;

    const leftDoor = document.createElement("div");
    leftDoor.className = "door left-door";

    const rightDoor = document.createElement("div");
    rightDoor.className = "door right-door";

    liftContainer.appendChild(leftDoor);
    liftContainer.appendChild(rightDoor);
    liftDiv.appendChild(liftContainer);
    firstFloorDiv.appendChild(liftDiv);
  });
};

const moveLift = async (destinationFloor, direction, liftIndex = null) => {
  try {
    let nearestLift;
    if (liftIndex === null) {
      nearestLift = getNearestAvailableLift(destinationFloor);
    } else {
      nearestLift = liftIndex;
    }

    if (nearestLift === null) {
      console.log("No available lifts at the moment, queueing the call");
      addToCallQueue(destinationFloor, direction);
      return;
    }

    const lift = state.lifts[nearestLift];

    lift.active = true;
    lift.direction = direction;

    const liftElement = document.getElementById(`lift${nearestLift}`);

    // Move lift
    await animateDiv(
      liftElement,
      -1 * (lift.currentFloor - destinationFloor) * 100,
      Math.abs(lift.currentFloor - destinationFloor) * FLOOR_TRAVEL_TIME
    );

    const liftContainer = document.getElementById(
      `lift-container${nearestLift}`
    );
    await openAndCloseDoors(liftContainer);

    lift.currentFloor = destinationFloor;
    lift.active = false;
    lift.direction = null;

    // Reset floor active state
    state.floors[destinationFloor][`${direction}Active`] = false;

    processCallQueue();
  } catch (error) {
    console.error("Error in moveLift:", error);
    if (nearestLift !== null) {
      state.lifts[nearestLift].active = false;
      state.lifts[nearestLift].direction = null;
    }
    state.floors[destinationFloor].active = false;
    processCallQueue(); // Attempt to process next call even if there was an error
  }
};

// Utility functions
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const animateDiv = (divElement, deltaY, duration) => {
  const computedStyle = window.getComputedStyle(divElement);
  const currentBottom = parseInt(computedStyle.bottom) || 0;
  const newBottom = currentBottom + deltaY;
  const animation = divElement.animate(
    [{ bottom: `${currentBottom}px` }, { bottom: `${newBottom}px` }],
    {
      duration: duration,
      easing: "ease-in-out",
      fill: "forwards",
    }
  );
  return animation.finished;
};

// function to handle door opening and closing
const openAndCloseDoors = async (liftContainer) => {
  openDoors(liftContainer);
  await wait(DOOR_OPEN_TIME);
  closeDoors(liftContainer);
  await wait(DOOR_CLOSE_TIME);
};

const getNearestNonActiveLift = (destinationFloor) => {
  return state.lifts.reduce(
    (nearest, lift, index) => {
      if (!lift.active) {
        const distance = Math.abs(lift.currentFloor - destinationFloor);
        if (distance < nearest.distance) {
          return { index, distance };
        }
      }
      return nearest;
    },
    { index: null, distance: Infinity }
  ).index;
};

const getNearestAvailableLift = (floorNumber) => {
  return state.lifts.reduce(
    (nearest, lift, index) => {
      if (!lift.active) {
        const distance = Math.abs(lift.currentFloor - floorNumber);
        if (distance < nearest.distance) {
          return { index, distance };
        }
      }
      return nearest;
    },
    { index: null, distance: Infinity }
  ).index;
};

const openDoors = (id) => {
  id.classList.add("doors-open");
};

const closeDoors = (id) => {
  id.classList.remove("doors-open");
};