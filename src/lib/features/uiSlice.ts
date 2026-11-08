import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UIState {
  isCreateGroupModalOpen: boolean;
  isEditGroupModalOpen: boolean;
  isViewProfileOpen: boolean;
}

const initialState: UIState = {
  isCreateGroupModalOpen: false,
  isEditGroupModalOpen: false,
  isViewProfileOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setIsCreateGroupModalOpen(state, action: PayloadAction<boolean>) {
      state.isCreateGroupModalOpen = action.payload;
    },
    setIsEditGroupModalOpen(state, action: PayloadAction<boolean>) {
      state.isEditGroupModalOpen = action.payload;
    },
    setIsViewProfileOpen(state, action: PayloadAction<boolean>) {
      state.isViewProfileOpen = action.payload;
    },
  },
});

export const { setIsCreateGroupModalOpen, setIsEditGroupModalOpen, setIsViewProfileOpen } =
  uiSlice.actions;
export default uiSlice.reducer;
