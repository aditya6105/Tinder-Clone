import coloredlogo from '../images/colored_Tinder-logo.png'
import whitelogo from '../images/white_Tinder-logo.png'

const Nav = ({ minimal, setShowModel, showModel, setIsSignUp }) => {

    const handleClick = () => {
        setShowModel(true)
        setIsSignUp(false)
    }
    
    const authToken = false;

    return (
        <nav>
            <div className="logo-container">
                <img className="logo" src={minimal ? coloredlogo : whitelogo} alt=""/>
            </div>
            {!authToken && !minimal &&<button 
                className="nav-button"
                onClick = {handleClick}
                disabled={showModel}
                >Log in
            </button>}
        </nav>
    )
}
export default Nav