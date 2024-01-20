// Github class definition
class Github {
    constructor() {
        
        this.url = "https://api.github.com/users/";
        this.repoUrl = "https://api.github.com/repos/";
        this.accessToken = config.MY_PAT;
    }

    async getGithubData(username, perPage = 10, page = 1) {
        try {
            const responseUser = await fetch(this.url + username, {
                headers: {
                    Authorization: 'Bearer ' + this.accessToken,
                },
            });

            if (!responseUser.ok) {
                
                if (responseUser.status === 404) {
                    // User not found
                    displayUserNotFoundMessage();
                    throw new Error(`User ${username} not found`);
                } else {
                    // Other error
                    throw new Error(`Error fetching GitHub data for user ${username}`);
                }
            }
    
            const responseRepo = await fetch(`${this.url}${username}/repos?per_page=${perPage}&page=${page}`, {
                headers: {
                    Authorization: 'Bearer ' + this.accessToken,
                },
            });

            if (!responseUser.ok || !responseRepo.ok) {
                throw new Error(`Error fetching GitHub data for user ${username}`);
            }

            const userData = await responseUser.json();
            const repoData = await responseRepo.json();

            // set language percentage of each repo
            for (let i in repoData) {
                // get language percentage of repo
                repoData[i].languages = await this.getRepoLanguages(username, repoData[i].name);
            }

            return {
                user: userData,
                repo: repoData,
                pagination: {
                    perPage: perPage,
                    page: page,
                    hasNextPage: responseRepo.headers.get('Link') ? true : false,
                },
            };
        } catch (error) {
            console.error(error);
            throw new Error(`Error fetching GitHub data for user ${username}`);
        }
    }

    async getRepoLanguages(username, reponame) {
        try {
            const languagesResponse = await fetch(
                this.repoUrl + username + "/" + reponame + "/languages", {
                    headers: {
                        Authorization: 'Bearer ' + this.accessToken,
                    },
                }
            );

            if (!languagesResponse.ok) {
                throw new Error(`Error fetching languages for repository ${reponame}`);
            }

            const languageStats = await languagesResponse.json();

            const totalPtsArr = Object.values(languageStats);
            const sumTotalPts = totalPtsArr.reduce((acc, pts) => acc + pts, 0);

            const languagesPercentage = {};
            Object.keys(languageStats).forEach((lang) => {
                languagesPercentage[lang] = (languageStats[lang] * 100) / sumTotalPts;
            });

            return languagesPercentage;
        } catch (error) {
            console.error(error);
            throw new Error(`Error fetching languages for repository ${reponame}`);
        }
    }
}


// Function to display user not found message
const displayUserNotFoundMessage = () => {
    const repositoriesContainer = document.getElementById('repositories');
    repositoriesContainer.innerHTML = '<p>User not found. Please enter a valid GitHub username.</p>';
};


// Function to create repository card
const createRepoCard = (repo) => {
    const repoCard = document.createElement('div');
    repoCard.classList.add('repo-card');

    const title = document.createElement('h2');
    title.textContent = repo.name;

    const description = document.createElement('p');
    description.textContent = repo.description || 'No description available';

    const topics = document.createElement('div');
    topics.classList.add('topics-container');

    // Add languages as topics
    if (repo.languages) {
        Object.keys(repo.languages).forEach(language => {
            const languageBox = document.createElement('div');
            languageBox.classList.add('topic-box', 'language-box');
            languageBox.textContent = `${language} (${repo.languages[language].toFixed(2)}%)`;
            topics.appendChild(languageBox);
        });
    }

    // Add other topics
    repo.topics.forEach(topic => {
        const topicBox = document.createElement('div');
        topicBox.classList.add('topic-box');
        topicBox.textContent = topic;
        topics.appendChild(topicBox);
    });

    repoCard.appendChild(title);
    repoCard.appendChild(description);
    repoCard.appendChild(topics);

    return repoCard;
};


// Function to display repositories in the UI
const displayRepositories = (repositories) => {
    const repositoriesContainer = document.getElementById('repositories');
    repositoriesContainer.innerHTML = '';

    repositories.forEach(repo => {
        const repoCard = createRepoCard(repo);
        repositoriesContainer.appendChild(repoCard);
    });

    // Hide loader after fetching data
    hideLoader();
};


// Function to update pagination controls
const updatePaginationControls = (currentPage, totalPages) => {
    const pageIndicator = document.getElementById('page-indicator');
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';

    // Create buttons for "Newer" and "Older"
    const newerButton = document.createElement('button');
    newerButton.textContent = 'Newer';
    newerButton.addEventListener('click', () => {
        showLoader();
        navigateToPage(currentPage - 1);
    });
    
    const olderButton = document.createElement('button');
    olderButton.textContent = 'Older';
    olderButton.addEventListener('click', () => {
        showLoader();
        navigateToPage(currentPage + 1);
    });

    // Display "Older" button if not on the last page
    if (currentPage > 1) {
        paginationContainer.appendChild(olderButton);
    }

    // Display pagination controls
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => {
            showLoader();
            navigateToPage(i);
        });

         // Add "active" class to the current page button
         if (i === currentPage) {
            pageButton.classList.add('active');
        }
        paginationContainer.appendChild(pageButton);
    }

    // Display "Newer" button if not on the first page
    if (currentPage < totalPages) {
        paginationContainer.appendChild(newerButton);
    }

    // Update page indicator
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
};



async function fetchRepositoriesPage(username, page) {
    const github = new Github();
    const perPage = 10; // Default number of repositories per page

    try {

        showLoader();
        // Fetch user data to get total repository count
        const { user, pagination: userPagination } = await github.getGithubData(username, 1, 1);

        // Fetch user and repository data for the specified page
        const { repo: repositories, pagination } = await github.getGithubData(username, perPage, page);

        // Update user details in the UI
        updateUserDetails(user);


        // After fetching the repositories, calculate the total number of pages
    const totalRepositories = user.public_repos; // Assuming user.public_repos gives the total number of public repositories
    const totalPages = Math.ceil(totalRepositories / perPage);

        

        // Display repositories in the UI
        displayRepositories(repositories);

        // Update page indicator and pagination controls
        updatePaginationControls(page, totalPages);
    } catch (error) {
        console.error(error.message);
        // Handle the error, e.g., display an error message to the user
        hideLoader(); // Ensure loader is hidden even in case of an error
    }
}



// Function to update jump to page controls
const updateJumpToPageControls = (currentPage, totalPages) => {
    const jumpToPageContainer = document.getElementById('jump-to-page-container');
    jumpToPageContainer.innerHTML = ''; // Clear existing controls

    const jumpToPageLabel = document.createElement('span');
    jumpToPageLabel.textContent = 'Jump to Page: ';

    const jumpToPageInput = document.createElement('input');
    jumpToPageInput.type = 'number';
    jumpToPageInput.min = 1;
    jumpToPageInput.max = totalPages;
    jumpToPageInput.value = currentPage;

    const jumpToPageButton = document.createElement('button');
    jumpToPageButton.textContent = 'Go';
    jumpToPageButton.addEventListener('click', () => jumpToPage(jumpToPageInput.value));

    jumpToPageContainer.appendChild(jumpToPageLabel);
    jumpToPageContainer.appendChild(jumpToPageInput);
    jumpToPageContainer.appendChild(jumpToPageButton);
};

// Function to navigate to a specific page
const jumpToPage = async (page) => {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim(); // Trim to remove any leading/trailing spaces

    try {
        if (username === '') {
            throw new Error('Please enter a GitHub username');
        }

        // Fetch and display repositories for the specified page
        await fetchRepositoriesPage(username, page);
    } catch (error) {
        console.error(error.message);
    }
};

let currentPage = 1;

const navigateToPage = async (page) => {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim(); // Trim to remove any leading/trailing spaces

    try {
        if (username === '') {
            throw new Error('Please enter a GitHub username');
        }
        // Update currentPage based on the requested page
        currentPage = page;
        // Fetch and display repositories for the specified page
        await fetchRepositoriesPage(username, page);
    } catch (error) {
        console.error(error.message);
    }
};


async function fetchAndDisplayRepositories() {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim(); // Trim to remove any leading/trailing spaces

    try {
        if (username === '') {
            throw new Error('Please enter a GitHub username');
        }

        // Show loader while fetching data
        showLoader();

        // Fetch repositories for the first page
        await fetchRepositoriesPage(username, 1);
    } catch (error) {
        console.error(error.message);
        // Handle the error, e.g., display an error message to the user
        hideLoader(); // Ensure loader is hidden even in case of an error
    }
}




// Function to show loader
const showLoader = () => {
    const loader = document.getElementById('loader');
    loader.style.display = 'block';

    
    // Scroll to the top of the page
    window.scrollTo({
        top: 0,
        behavior: 'smooth' // Optionally, you can use 'auto' instead of 'smooth'
    });
};

// Function to hide loader
const hideLoader = () => {
    const loader = document.getElementById('loader');
    loader.style.display = 'none';
};



const updateUserDetails = (user) => {
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userBio = document.getElementById('user-bio');
    const userLocation = document.getElementById('user-location');
    const twitterProfileLink = document.getElementById('twitter-profile-link');
    const githubProfileLink = document.getElementById('github-profile-link');

    // Update user details based on API response
    userAvatar.src = user.avatar_url;
    userName.textContent = user.name || user.login; // Display name if available, otherwise use username
    userBio.textContent = user.bio || 'No bio available';
    userLocation.textContent = user.location || 'Location not specified';

    // Update social links
    if (user.twitter_username) {
        twitterProfileLink.href = `https://twitter.com/${user.twitter_username}`;
        twitterProfileLink.textContent = `Twitter: @${user.twitter_username}`;
    } else {
        twitterProfileLink.textContent = 'Twitter link not available';
    }

    githubProfileLink.href = user.html_url;
    githubProfileLink.textContent = `GitHub Profile: ${user.html_url}`;
};



// Function to handle key press event
const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        document.getElementById('get-repositories-button').click();
    }
};

// Add event listener to input field
document.getElementById('username').addEventListener('keypress', handleKeyPress);


document.getElementById('get-repositories-button').addEventListener('click', () => {
    navigateToPage(1);
});

document.getElementById('newer-button').addEventListener('click', () => navigateToPage(currentPage + 1));
document.getElementById('older-button').addEventListener('click', () => navigateToPage(currentPage - 1));








