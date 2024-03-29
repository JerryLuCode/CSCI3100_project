/* Import react library */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

/* Import redux library */
import { useDispatch } from "react-redux";

/* Import redux reducers */
import { setToggleAddFriendsModal, } from "../../redux/Reducers/modalReducer";
import { setProfileUser, } from "../../redux/Reducers/postReducer";

/* Import components */
import SearchBar from "../SearchBar/SearchBar";


const AddFriendsModal = (props) => {

    /* Access action from redux store */
    const dispatch = useDispatch();

    /* Navagate hook */
    const navigate = useNavigate();

    const toggleAddFriendsModal = () => {
        dispatch(setToggleAddFriendsModal());
    }

    const handleDataReceivedFromChild = (user) => {
        dispatch(setProfileUser(user));
        dispatch(setToggleAddFriendsModal());
        navigate(`/profile/other/${user._id}`);
    }

    return ( 
        <>

          <div className="modal-container">
                <div className="modal-overlay">
                    <div className="modal-grid-container smaller">
                        {/* Column 1 */}
                        <div className="add-friend-modal-col-1">
                            <SearchBar sendDataToParent={handleDataReceivedFromChild}/>
                            <button className="close-button" onClick={toggleAddFriendsModal}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
 
export default AddFriendsModal;