import { Link } from 'react-router-dom'

const PlayList = ({ plays, user }) => {
  if(!plays){
    return <div>Loading...</div>
  }


  return (
    <div>
      { user && <p>logged in as {user.name}</p> }
      <h2>Pièces</h2>
      <ul aria-label="plays list">
        {[...plays].sort((a, b) => b.likes - a.likes).map(play =>
          <li key={play.id}>
            <Link to={`/plays/${play.id}`}>{play.title} by {play.author} </Link>
          </li>
        )}
      </ul>
    </div>)
}


export default PlayList