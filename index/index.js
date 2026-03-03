import { Modal } from 'bootstrap';
import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { toPostRoute } from '/src/router/router.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';
import { getLoginPath } from '/src/lib/auth.js';

mountHeader('#app-header');
mountFooter('#app-footer');

const HERO_PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1800&q=80';
const CARD_PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1526481280695-3c4691f5e66c?auto=format&fit=crop&w=1200&q=80';

const featuredLoading = document.querySelector('#featured-loading');
const featuredEmpty = document.querySelector('#featured-empty');
const featuredCarouselWrapper = document.querySelector('#featured-carousel-wrapper');
const featuredIndicators = document.querySelector('#featured-carousel-indicators');
const featuredInner = document.querySelector('#featured-carousel-inner');
const featuredCarouselElement = document.querySelector('#featured-carousel');

const countrySearch = document.querySelector('#countrySearch');
const postsLoading = document.querySelector('#posts-loading');
const postsContainer = document.querySelector('#postsContainer');
const heroSeePostsButton = document.querySelector('#hero-see-posts-button');
const countryPostsTitle = document.querySelector('#country-posts-title');
const selectedCountryId = new URLSearchParams(window.location.search).get('country_id');

const createPostModalElement = document.querySelector('#createPostModal');
const homeCreatePostForm = document.querySelector('#home-create-post-form');
const homeCreatePostSubmit = document.querySelector('#home-create-post-submit');
const homeCreatePostMessage = document.querySelector('#home-create-post-message');
const homePostTitle = document.querySelector('#home-post-title');
const homePostContent = document.querySelector('#home-post-content');
const homePostCountry = document.querySelector('#home-post-country');
const homePostPhoto = document.querySelector('#home-post-photo');

let allPosts = [];
let currentUser = null;
let homeCreatePostModal = null;

function getPostActionHref(postId) {
	if (!currentUser) {
		return getLoginPath();
	}

	return toPostRoute(postId);
}

function getPostActionLabel() {
	if (!currentUser) {
		return 'Login to Read';
	}

	return 'Read Full Post';
}

function wireGuestCreatePostPrompt() {
	const createPostTrigger = document.querySelector('[data-bs-target="#createPostModal"]');
	if (!createPostTrigger || currentUser) {
		return;
	}

	createPostTrigger.textContent = 'Login to Create Post';
	createPostTrigger.removeAttribute('data-bs-toggle');
	createPostTrigger.removeAttribute('data-bs-target');
	createPostTrigger.addEventListener('click', () => {
		window.location.assign(getLoginPath());
	});
}

function setHeroBackground() {
	const heroSection = document.querySelector('.hero-section');
	if (!heroSection) {
		return;
	}

	heroSection.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(${HERO_PLACEHOLDER_IMAGE})`;
}

function showAlert(target, message, variant = 'warning') {
	if (!target) {
		return;
	}

	target.className = `alert alert-${variant} mb-3`;
	target.textContent = message;
	target.classList.remove('d-none');
}

function hideElement(element) {
	if (element) {
		element.classList.add('d-none');
	}
}

function setHomeCreatePostMessage(text, variant = 'secondary') {
	homeCreatePostMessage.className = `small mt-3 mb-0 text-${variant}`;
	homeCreatePostMessage.textContent = text;
}

function clearHomeCreatePostMessage() {
	homeCreatePostMessage.className = 'small mt-3 mb-0';
	homeCreatePostMessage.textContent = '';
}

function resetHomeCreatePostForm() {
	homeCreatePostForm.reset();
	clearHomeCreatePostMessage();
}

function populateHomeCountryOptions(countries) {
	homePostCountry.innerHTML = '<option value="">Select a country</option>';

	countries.forEach((country) => {
		const option = document.createElement('option');
		option.value = country.id;
		option.textContent = country.name;
		homePostCountry.appendChild(option);
	});
}

function fileToDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			resolve(typeof reader.result === 'string' ? reader.result : null);
		};
		reader.onerror = () => reject(new Error('Unable to read selected file.'));
		reader.readAsDataURL(file);
	});
}

function normalizeCountryName(post) {
	if (!post?.countries) {
		return 'Unknown Country';
	}

	if (Array.isArray(post.countries)) {
		return post.countries[0]?.name || 'Unknown Country';
	}

	return post.countries.name || 'Unknown Country';
}

function createFeaturedSlide(post, index) {
	const indicator = document.createElement('button');
	indicator.type = 'button';
	indicator.setAttribute('data-bs-target', '#featured-carousel');
	indicator.setAttribute('data-bs-slide-to', String(index));
	indicator.setAttribute('aria-label', `Slide ${index + 1}`);

	if (index === 0) {
		indicator.classList.add('active');
		indicator.setAttribute('aria-current', 'true');
	}

	const item = document.createElement('article');
	item.className = `carousel-item ${index === 0 ? 'active' : ''}`;

	const slideImage = post.image_url || CARD_PLACEHOLDER_IMAGE;

	const slideBody = document.createElement('div');
	slideBody.className = 'featured-slide d-flex align-items-end';
	slideBody.style.backgroundImage = `linear-gradient(0deg, rgba(0,0,0,0.65) 15%, rgba(0,0,0,0.2) 70%), url(${slideImage})`;

	const caption = document.createElement('div');
	caption.className = 'carousel-caption text-start pb-4';

	const heading = document.createElement('h3');
	heading.className = 'h4';
	heading.textContent = post.title;

	const button = document.createElement('a');
	button.className = 'btn btn-warning';
	button.href = getPostActionHref(post.id);
	button.textContent = currentUser ? 'Read Post' : 'Login to Read';

	caption.append(heading, button);
	slideBody.appendChild(caption);
	item.appendChild(slideBody);

	return { indicator, item };
}

function renderFeaturedPosts(posts) {
	featuredIndicators.innerHTML = '';
	featuredInner.innerHTML = '';

	if (!posts.length) {
		showAlert(featuredEmpty, 'No featured posts available yet.', 'light');
		hideElement(featuredCarouselWrapper);
		return;
	}

	posts.forEach((post, index) => {
		const { indicator, item } = createFeaturedSlide(post, index);
		featuredIndicators.appendChild(indicator);
		featuredInner.appendChild(item);
	});

	if (posts.length === 1) {
		featuredCarouselElement.querySelectorAll('.carousel-control-prev, .carousel-control-next').forEach((control) => {
			control.classList.add('d-none');
		});
	}

	featuredCarouselWrapper.classList.remove('d-none');
}

function createPostCard(post) {
	const column = document.createElement('article');
	column.className = 'col';
	column.dataset.countryId = post.country_id;

	const card = document.createElement('div');
	card.className = 'card h-100 shadow-sm';

	const image = document.createElement('img');
	image.src = post.image_url || CARD_PLACEHOLDER_IMAGE;
	image.className = 'card-img-top post-card-image';
	image.alt = post.title;

	const body = document.createElement('div');
	body.className = 'card-body d-flex flex-column';

	const countryBadge = document.createElement('span');
	countryBadge.className = 'badge text-bg-light border mb-2 align-self-start';
	countryBadge.textContent = normalizeCountryName(post);

	const title = document.createElement('h3');
	title.className = 'h5 card-title';
	title.textContent = post.title;

	const link = document.createElement('a');
	link.className = 'btn btn-outline-primary mt-auto';
	link.href = getPostActionHref(post.id);
	link.textContent = getPostActionLabel();

	body.append(countryBadge, title, link);
	card.append(image, body);
	column.appendChild(card);

	return column;
}

function renderPosts(postsArray) {
	postsContainer.innerHTML = '';

	if (!postsArray.length) {
		postsContainer.innerHTML = '<p class="text-muted">No posts found for this country.</p>';
		return;
	}

	postsArray.forEach((post) => {
		postsContainer.appendChild(createPostCard(post));
	});
}

function filterPostsByCountryAndSearch(postsArray, searchTerm = '') {
	let filteredPosts = postsArray;

	if (selectedCountryId) {
		filteredPosts = filteredPosts.filter((post) => String(post.country_id) === String(selectedCountryId));
	}

	if (!searchTerm) {
		return filteredPosts;
	}

	return filteredPosts.filter((post) => {
		const countryName = normalizeCountryName(post).toLowerCase();
		return countryName.includes(searchTerm);
	});
}

async function fetchFeaturedPosts(supabase) {
	const { data, error } = await supabase
		.from('posts')
		.select('id, title, image_url, created_at')
		.eq('is_approved', true)
		.order('created_at', { ascending: false })
		.limit(3);

	if (error) {
		throw new Error(error.message);
	}

	return data || [];
}

async function fetchApprovedPosts(supabase, countryId = null) {
	let query = supabase
		.from('posts')
		.select('id, title, image_url, country_id, created_at, countries(name)')
		.eq('is_approved', true)
		.order('created_at', { ascending: false });

	if (countryId) {
		query = query.eq('country_id', countryId);
	}

	const { data, error } = await query;

	if (error) {
		throw new Error(error.message);
	}

	return data || [];
}

async function fetchCountries(supabase) {
	const { data, error } = await supabase
		.from('countries')
		.select('id, name')
		.order('name', { ascending: true });

	if (error) {
		throw new Error(error.message);
	}

	return data || [];
}

async function fetchCountryNameById(supabase, countryId) {
	if (!countryId) {
		return null;
	}

	const { data, error } = await supabase
		.from('countries')
		.select('name')
		.eq('id', countryId)
		.maybeSingle();

	if (error) {
		throw new Error(error.message);
	}

	return data?.name || null;
}

function wireHomeCreatePost(supabase) {
	homeCreatePostModal = Modal.getOrCreateInstance(createPostModalElement);

	createPostModalElement.addEventListener('hidden.bs.modal', () => {
		homeCreatePostSubmit.disabled = false;
		resetHomeCreatePostForm();
	});

	homeCreatePostForm.addEventListener('submit', async (event) => {
		event.preventDefault();

		const title = homePostTitle.value.trim();
		const content = homePostContent.value.trim();
		const countryId = homePostCountry.value;
		const selectedFile = homePostPhoto.files?.[0] || null;

		if (!title || !content) {
			setHomeCreatePostMessage('Title and content are required.', 'danger');
			return;
		}

		if (!countryId) {
			setHomeCreatePostMessage('Please select a country.', 'danger');
			return;
		}

		homeCreatePostSubmit.disabled = true;
		setHomeCreatePostMessage('Creating post...', 'secondary');

		let imageUrl = null;
		if (selectedFile) {
			try {
				imageUrl = await fileToDataUrl(selectedFile);
			} catch (error) {
				homeCreatePostSubmit.disabled = false;
				setHomeCreatePostMessage(error instanceof Error ? error.message : 'Unable to read selected file.', 'danger');
				return;
			}
		}

		const payload = {
			title,
			content,
			country_id: countryId,
			author_id: currentUser.id
		};

		if (imageUrl) {
			payload.image_url = imageUrl;
		}

		const { error } = await supabase.from('posts').insert(payload);
		if (error) {
			homeCreatePostSubmit.disabled = false;
			setHomeCreatePostMessage(error.message, 'danger');
			return;
		}

		homeCreatePostSubmit.disabled = false;
		setHomeCreatePostMessage('Post submitted successfully.', 'success');

		window.setTimeout(() => {
			homeCreatePostModal.hide();
		}, 700);
	});
}

async function initDashboard() {
	setHeroBackground();

	heroSeePostsButton?.addEventListener('click', (event) => {
		event.preventDefault();
		countryPostsTitle?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	});

	const supabase = requireSupabase();
	if (!supabase) {
		showAlert(featuredLoading, 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.', 'warning');
		showAlert(postsLoading, 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.', 'warning');
		return;
	}

	const { data: sessionData } = await supabase.auth.getSession();
	currentUser = sessionData?.session?.user || null;
	wireGuestCreatePostPrompt();

	try {
		const [featuredPosts, approvedPosts, selectedCountryName, countries] = await Promise.all([
			fetchFeaturedPosts(supabase),
			fetchApprovedPosts(supabase, selectedCountryId),
			fetchCountryNameById(supabase, selectedCountryId),
			currentUser ? fetchCountries(supabase) : Promise.resolve([])
		]);

		allPosts = approvedPosts;
		if (currentUser) {
			populateHomeCountryOptions(countries);
			wireHomeCreatePost(supabase);
		}

		if (selectedCountryId) {
			if (selectedCountryName) {
				countryPostsTitle.textContent = `Posts from ${selectedCountryName}`;
			} else {
				countryPostsTitle.textContent = 'Posts by Country';
			}
		}

		hideElement(featuredLoading);
		renderFeaturedPosts(featuredPosts);

		hideElement(postsLoading);
		renderPosts(filterPostsByCountryAndSearch(allPosts));

		countrySearch?.addEventListener('input', (event) => {
			const searchTerm = event.target.value.toLowerCase();
			const filteredArray = filterPostsByCountryAndSearch(allPosts, searchTerm);

			renderPosts(filteredArray);
		});
	} catch (error) {
		hideElement(featuredCarouselWrapper);
		showAlert(featuredLoading, `Could not load featured posts: ${error.message}`, 'danger');
		showAlert(postsLoading, `Could not load posts: ${error.message}`, 'danger');
	}
}

initDashboard();
