import Print from "../Utils/print";

type state = 'IDLE' | 'PICK' | 'DROP' | 'CHARGE' | 'MOVE';

class RobotStateCore {
    private readonly print!:Print;
    private state:state = "IDLE";

    constructor(initialState:state) {
        this.state = initialState
        this.print.log('Robot State Core Initialized with Initial State as =>', this.state)
    }

    setState(newState:state) {
        this.state = newState;
    }

    getState():state {
        return this.state
    }
}

export default RobotStateCore
