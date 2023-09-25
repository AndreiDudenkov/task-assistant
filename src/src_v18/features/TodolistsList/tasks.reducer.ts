import {AppThunk} from 'app/store';
import {
    fetchTodolists,
    removeTodolist,
    todolistsActions,
    todolistThunks
} from 'features/TodolistsList/todolists.reducer';
import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {clearTasksAndTodolists} from 'common/actions/common.actions';
import {appActions} from '../../app/app.reducer';
import {createAppAsyncThunk, handleServerAppError, handleServerNetworkError} from 'common/utils';
import {TaskPriorities, TaskStatuses} from '../../common/enums/enums';
import {AddTaskArg, RemoveTaskArg, taksksAPI, TaskType, UpdateTaskArg, UpdateTaskModelType} from './tasksApi';
import {TodolistType} from './todolistApi';


const initialState: TasksStateType = {};

const slice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchTasks.fulfilled, (state, action) => {
                state[action.payload.todolistId] = action.payload.tasks;
            })
            .addCase(addTask.fulfilled, (state, action) => {
                const tasks = state[action.payload.task.todoListId];

                tasks.unshift(action.payload.task);
            })
            .addCase(removeTask.fulfilled, (state, action) => {
                const tasks = state[action.payload.todolistId];
                const index = tasks.findIndex((t) => t.id === action.payload.taskId);
                if (index !== -1) tasks.splice(index, 1);
            })
            .addCase(updateTask.fulfilled, (state, action) => {
                const tasks = state[action.payload.todolistId];
                const index = tasks.findIndex((t) => t.id === action.payload.taskId);
                if (index !== -1) {
                    tasks[index] = {...tasks[index], ...action.payload.domainModel};
                }
            })
            .addCase(todolistThunks.addTodolist.fulfilled, (state, action) => {
                state[action.payload.todolist.id] = [];
            })
            .addCase(removeTodolist.fulfilled, (state, action) => {
                delete state[action.payload.id];
            })
            .addCase(fetchTodolists.fulfilled, (state, action) => {
                action.payload.forEach((tl:TodolistType) => {
                    state[tl.id] = [];
                });
            })
            .addCase(clearTasksAndTodolists, () => {
                return {};
            });
    },
});


// thunks

const fetchTasks = createAppAsyncThunk<{ tasks: TaskType[], todolistId: string },
    string>('tasks/fetchTasks',
    async (todolistId: string, thunkAPI) => {
        const {dispatch, rejectWithValue} = thunkAPI
        try {
            dispatch(appActions.setAppStatus({status: 'loading'}));
            const res = await taksksAPI.getTasks(todolistId)
            const tasks = res.data.items;
            dispatch(appActions.setAppStatus({status: 'succeeded'}))
            return {tasks, todolistId};
        } catch (e) {
            handleServerNetworkError(e, dispatch)
            return rejectWithValue(null)
        }

    })

export const addTask = createAppAsyncThunk<{ task: TaskType }, AddTaskArg>
('tasks/addTask', async (arg, thunkAPI) => {
    const {dispatch, rejectWithValue} = thunkAPI
    try {
        dispatch(appActions.setAppStatus({status: 'loading'}));
        const res = await taksksAPI.createTask(arg)
        if (res.data.resultCode === 0) {
            const task = res.data.data.item;
            dispatch(appActions.setAppStatus({status: 'succeeded'}));
            return {task};
        } else {
            handleServerAppError(res.data, dispatch);
            return rejectWithValue(null)
        }

    } catch (e) {
        handleServerNetworkError(e, dispatch)
        return rejectWithValue(null)
    }
})

const updateTask = createAppAsyncThunk<UpdateTaskArg, UpdateTaskArg>('task/updateTask', async (arg, thunkAPI) => {
    const {dispatch, rejectWithValue, getState} = thunkAPI
    try {
        const state = getState();
        const task = state.tasks[arg.todolistId].find((t) => t.id === arg.taskId);
        if (!task) {
            //throw new Error("task not found in the state");
            console.warn('task not found in the state');
            return rejectWithValue(null)
        }
        const apiModel: UpdateTaskModelType = {
            deadline: task.deadline,
            description: task.description,
            priority: task.priority,
            startDate: task.startDate,
            title: task.title,
            status: task.status,
            ...arg.domainModel,
        };
        const res = await taksksAPI.updateTask(arg.todolistId, arg.taskId, apiModel)
        if (res.data.resultCode === 0) {
            return {taskId: arg.taskId, domainModel: arg.domainModel, todolistId: arg.todolistId}
        } else {
            handleServerAppError(res.data, dispatch);
            return rejectWithValue(null)
        }
    } catch (e) {
        handleServerNetworkError(e, dispatch)
        return rejectWithValue(null)
    }
})


export const removeTask = createAppAsyncThunk<RemoveTaskArg, RemoveTaskArg>('task/removeTask',
    async (arg, thunkAPI) => {
        const {dispatch, rejectWithValue, getState} = thunkAPI
        try {
            dispatch(appActions.setAppStatus({status: 'loading'}));
            const res = await taksksAPI.deleteTask(arg)
            if (res.data.resultCode === 0) {
                dispatch(appActions.setAppStatus({status: 'succeeded'}));
                return {taskId: arg.taskId, todolistId: arg.todolistId}
            }
            return rejectWithValue(null)
        } catch (e) {
            handleServerNetworkError(e, dispatch)
            return rejectWithValue(null)
        }
    }
)


export const tasksReducer = slice.reducer;
export const tasksActions = slice.actions;
export const tasksThunks = {fetchTasks, addTask, updateTask, removeTask}


// types
export type UpdateDomainTaskModelType = {
    title?: string;
    description?: string;
    status?: TaskStatuses;
    priority?: TaskPriorities;
    startDate?: string;
    deadline?: string;
};
export type TasksStateType = {
    [key: string]: Array<TaskType>;
};