import Post from "../schema/Post.js";
import User from "../schema/User.js";
import {v2 as cloudinary} from 'cloudinary';
import { extractPublicId } from 'cloudinary-build-url';

/* Cloudinary database configuration */
cloudinary.config({ 
    cloud_name: process.env.cloud_name, 
    api_key: process.env.api_key, 
    api_secret: process.env.api_secret,
});

/* Post-creating function */
export const createPost = async(req,res) => {
        /* grab the data sent from front-end */
        const userId = req.params.userId;
        const postImgURL = req.body.postImgURL;     // base64 URL
        const title = req.body.title;
        const description = req.body.description;
        const isPrivate = req.body.isPrivate;

        /* Upload the post to Cloudinary and get the image url */
        const randomNum= Date.now();
        const uploadedImage = await cloudinary.uploader.upload(postImgURL[0],{
            upload_preset: 'posts_unsigned_upload', 
            public_id: `${userId}_${randomNum}`, 
            allowed_formats: ['png', 'jpg', 'jpeg', 'svg', 'ico', 'jfif', 'webp'],
        }, 
        (err,data) => {
            if (err){
                console.log(err);
            }
        });

        /* Create a post in MongoDB */
        const user = await User.findById(userId);

        const newPost = new Post({
            userId: user._id,
            userName: user.userName,
            title: title,
            description: description,
            userAvatarURL: user.userAvatarURL,
            postImgURL: uploadedImage.url,
            likes: [],
            comments: [],
            isPrivate: isPrivate,
        })
        await newPost.save();
    
        /* Find a specific post from MongoDB */
        const post = await Post.findOne({userId: user._id, postImgURL: uploadedImage.url}); 
        
    try {
        /* Send that specific post and post url to front-end */
        res.status(200).json({postURL: uploadedImage.url, post:post});

    } catch (err) {
        res.status(409).json({message: err.message});
    }
}

/* Get user's posts function */
export const getUserPosts = async (req,res) =>{
    try {
        // grab the other user id in request object
        const userId = req.params.userId;

        /* Find all the user posts from MongoDB */
        const posts = await Post.find({userId:userId});

        /* Send all the user posts information to front-end */
        res.status(200).json({posts: posts});

    } catch (err) {
        res.status(404).json({message: err.message});
    }
}

/* Update a post */
export const updatePost = async (req,res) => {
    try {
        /* grab the data sent from front-end */
        const userId = req.params.userId;
        const postId = req.body.postId;
        const title = req.body.title;
        const description = req.body.description;
        const isPrivate = req.body.isPrivate;
    
        /* Update the 'post' schema in MongoDB */
        const user = await User.findById(userId);
        if (!user){
            return res.status(404).json({ message: 'User not found' });
        }
        else{
            let updatedPostInfo = await Post.findOneAndUpdate({_id: postId}, { $set: {title: title, description: description, isPrivate: isPrivate}}, {new: true});
            if (updatedPostInfo){
                /* Send that updated post and post url to front-end */
                res.status(200).json(updatedPostInfo);
            }
        }
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};



/* Delete user post */
export const deleteUserPost = async (req,res) => {
    try {
        /* grab the data sent from front-end */
        const userId = req.params.userId;
        const postId = req.params.postId;
        const postImgURL = req.body.postImgURL;
    
        /* Find a specifc user in MongoDB */
        const user = await User.findById(userId);
        if (!user){
            return res.status(404).json({ message: 'User not found' });
        }
        else{
            /* Remove a specific post from 'posts' attribute inside the 'user' schema in MongoDB */
            const updatedList = user.posts.filter((imageUrl,index) => imageUrl !== postImgURL);
            await User.updateOne({_id: userId}, {$set: {posts: updatedList}})
            .catch((err) =>{
                return res.status(404).json({ message: err });
            })

            /* Remove a specific post from inside the 'post' schema in MongoDB */
            const deletedPost = await Post.findByIdAndDelete(postId);
            if (!deletedPost){
                return res.status(404).json({ message: 'Post not found' });
            }

            /* Remove a specific post from Cloudinary */
            const publicId = extractPublicId(postImgURL);
            const result = await cloudinary.uploader.destroy(publicId);
            if (!result){
                return res.status(404).json({ message: 'Post not found' });
            }

            /* Send the success message to front-end */
            return res.status(200).json({ message: 'Post Deletion Successful' });
        }

    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};


/* Get all the posts from database function */
export const getAllPosts = async (req,res) =>{
    try {
        // find all the posts in the database
        const post = await Post.find();

        // send the post info to front-end
        res.status(201).json(post);

    } catch (err) {
        res.status(404).json({message: err.message});
    }
}


/* Like/unlike post function */
export const updateLikePost = async (req,res) =>{
    try {
        /* grab the data sent from front-end */
        const profileUserId = req.params.userId;        
        const profileUser = await User.findById(profileUserId);
        

        if (!profileUser){
            return res.status(404).json({ message: 'User not found' });
        }
        else {
            /* grab the data sent from front-end */
            const postIndex = req.body.postIndex;
            const postImgURL = profileUser.posts[postIndex];

            /* Find a specific post and update the likes  */
            const post = await Post.findOne({postImgURL: postImgURL});

            if (!post){
                return res.status(404).json({ message: 'Post not found' });
            } 
            else{
                /* Find whether the user have like the post */
                const userId = req.body.userId;
                let isLiked = false;            
                post.likes.some((likedUserId) => {
                    if (likedUserId === userId) {
                        isLiked = true;
                        return true;    // Exit the loop
                    }
                    return false;
                });


                if (!isLiked){
                    /* If the user haven't like the post before, trigger like the post */
                    await Post.findOneAndUpdate({postImgURL: postImgURL}, { $push: {likes: userId }}, {new: true});
                }
                else {
                    /* If the user have like the post before, trigger unlike the post */
                    await Post.findOneAndUpdate({postImgURL: postImgURL}, { $pull: {likes: userId }});
                }

                return res.status(200).json({isLiked: isLiked});
            }

        }

    } catch (err) {
        res.status(404).json({message: err.message});
    }
}

