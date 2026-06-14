import { AppUpdateComment, UserProfile } from '../types';
import DiscussionComments from './DiscussionComments';

interface AppUpdateCommentsProps {
  updateId: string;
  postedByUserId: string;
  comments: AppUpdateComment[];
  currentUserId?: string;
  userProfile?: UserProfile | null;
  onAddComment: (text: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onRequireSignIn?: () => void;
  onViewProfile?: (userId: string) => void;
}

export default function AppUpdateComments(props: AppUpdateCommentsProps) {
  return (
    <DiscussionComments
      entityId={props.updateId}
      scope="update"
      postedByUserId={props.postedByUserId}
      comments={props.comments}
      currentUserId={props.currentUserId}
      userProfile={props.userProfile}
      onAddComment={props.onAddComment}
      onDeleteComment={props.onDeleteComment}
      onRequireSignIn={props.onRequireSignIn}
      onViewProfile={props.onViewProfile}
    />
  );
}
